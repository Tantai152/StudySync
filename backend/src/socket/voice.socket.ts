import { Server, Namespace, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '../config/env.js';
import { prisma } from '../config/prisma.js';

const MAX_PER_ROOM = 4;

// In-memory state: roomId -> Map<userId, { socketId, muted }>
const voiceRooms = new Map<string, Map<string, { socketId: string; muted: boolean }>>();

// Track which room each socket is in (for disconnect cleanup)
const socketRoomMap = new Map<string, string>(); // socketId -> roomId

// Zod schemas
const joinSchema = z.object({ roomId: z.string().min(1) });
const leaveSchema = z.object({ roomId: z.string().min(1) });
const offerSchema = z.object({
  roomId: z.string().min(1),
  toUserId: z.string().min(1),
  sdp: z.string().min(1),
});
const answerSchema = z.object({
  roomId: z.string().min(1),
  toUserId: z.string().min(1),
  sdp: z.string().min(1),
});
const iceSchema = z.object({
  roomId: z.string().min(1),
  toUserId: z.string().min(1),
  candidate: z.string().min(1),
});
const muteSchema = z.object({
  roomId: z.string().min(1),
  muted: z.boolean(),
});

interface ForwardSignalData {
  fromUserId: string;
  sdp?: string;
  candidate?: string;
}

export function registerVoiceNamespace(io: Server) {
  const voiceNs = io.of('/voice');

  // Auth middleware (same pattern as chat namespace '/')
  voiceNs.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('UNAUTHORIZED'));
    }
    try {
      const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as {
        userId: string;
      };
      socket.data.userId = decoded.userId;
      next();
    } catch {
      return next(new Error('UNAUTHORIZED'));
    }
  });

  voiceNs.on('connection', (socket) => {
    const userId = socket.data.userId!;
    console.log(`[voice] User connected: ${userId} (${socket.id})`);

    socket.on('voice:join', async (payload: unknown) => {
      const parse = joinSchema.safeParse(payload);
      if (!parse.success) {
        socket.emit('voice:error', {
          code: 'VALIDATION_ERROR',
          message: 'Dữ liệu không hợp lệ',
        });
        return;
      }

      const { roomId } = parse.data;

      // Verify membership
      const member = await prisma.roomMember.findUnique({
        where: { roomId_userId: { roomId, userId } },
      });
      if (!member) {
        socket.emit('voice:error', {
          code: 'NOT_A_MEMBER',
          message: 'Bạn không phải là thành viên của phòng này',
        });
        return;
      }

      // Check room capacity
      let roomMembers = voiceRooms.get(roomId);
      if (!roomMembers) {
        roomMembers = new Map();
        voiceRooms.set(roomId, roomMembers);
      }

      if (roomMembers.size >= MAX_PER_ROOM && !roomMembers.has(userId)) {
        socket.emit('voice:error', {
          code: 'ROOM_FULL',
          message: 'Phòng voice đã đủ 4 người',
        });
        return;
      }

      // Join
      roomMembers.set(userId, { socketId: socket.id, muted: false });
      socketRoomMap.set(socket.id, roomId);
      socket.join(`voice:${roomId}`);

      // Notify peers
      socket.to(`voice:${roomId}`).emit('voice:peer-joined', {
        userId,
        socketId: socket.id,
      });

      // Send roster to joiner (peers already in room, excluding self)
      const peers = Array.from(roomMembers.entries())
        .filter(([uid]) => uid !== userId)
        .map(([uid, info]) => ({ userId: uid, muted: info.muted }));
      socket.emit('voice:roster', { members: peers });

      console.log(`[voice] ${userId} joined voice room ${roomId}`);
    });

    socket.on('voice:leave', (payload: unknown) => {
      const parse = leaveSchema.safeParse(payload);
      if (!parse.success) return;

      const { roomId } = parse.data;
      handleLeave(socket, userId, roomId);
    });

    socket.on('voice:offer', (payload: unknown) => {
      const parse = offerSchema.safeParse(payload);
      if (!parse.success) return;
      const { roomId, toUserId, sdp } = parse.data;
      forwardSignal(voiceNs, roomId, toUserId, 'voice:offer', {
        fromUserId: userId,
        sdp,
      });
    });

    socket.on('voice:answer', (payload: unknown) => {
      const parse = answerSchema.safeParse(payload);
      if (!parse.success) return;
      const { roomId, toUserId, sdp } = parse.data;
      forwardSignal(voiceNs, roomId, toUserId, 'voice:answer', {
        fromUserId: userId,
        sdp,
      });
    });

    socket.on('voice:ice', (payload: unknown) => {
      const parse = iceSchema.safeParse(payload);
      if (!parse.success) return;
      const { roomId, toUserId, candidate } = parse.data;
      forwardSignal(voiceNs, roomId, toUserId, 'voice:ice', {
        fromUserId: userId,
        candidate,
      });
    });

    socket.on('voice:mute', (payload: unknown) => {
      const parse = muteSchema.safeParse(payload);
      if (!parse.success) return;
      const { roomId, muted } = parse.data;

      const roomMembers = voiceRooms.get(roomId);
      if (roomMembers?.has(userId)) {
        roomMembers.get(userId)!.muted = muted;
        socket.to(`voice:${roomId}`).emit('voice:peer-muted', {
          userId,
          muted,
        });
      }
    });

    socket.on('disconnect', () => {
      const roomId = socketRoomMap.get(socket.id);
      if (roomId && userId) {
        handleLeave(socket, userId, roomId);
      }
      socketRoomMap.delete(socket.id);
    });
  });

  function handleLeave(
    socket: Socket,
    userId: string,
    roomId: string
  ) {
    const roomMembers = voiceRooms.get(roomId);
    if (!roomMembers) return;

    roomMembers.delete(userId);
    socket.leave(`voice:${roomId}`);
    socketRoomMap.delete(socket.id);

    // Notify peers (works for both leave and disconnect)
    socket.to(`voice:${roomId}`).emit('voice:peer-left', { userId });

    if (roomMembers.size === 0) {
      voiceRooms.delete(roomId);
    }
  }
}

function forwardSignal(
  voiceNs: Namespace,
  roomId: string,
  toUserId: string,
  event: string,
  data: ForwardSignalData
) {
  const roomMembers = voiceRooms.get(roomId);
  if (!roomMembers?.has(toUserId)) return;
  const target = roomMembers.get(toUserId)!;
  // Socket.IO auto-joins each socket to a room named after its own socketId
  voiceNs.to(target.socketId).emit(event, data);
}

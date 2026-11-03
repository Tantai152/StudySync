import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { prisma } from '../config/prisma.js';
import * as messageService from '../services/message.service.js';

// Mở rộng kiểu dữ liệu của Socket để lưu userId
interface AuthSocket extends Socket {
  userId?: string;
}

export const setupSocket = (io: Server) => {
  // 1. Middleware xác thực Socket bằng JWT Token
  io.use((socket: AuthSocket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Unauthorized: No token provided'));
    }

    try {
      const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as { userId: string };
      socket.userId = decoded.userId;
      next();
    } catch {
      next(new Error('Unauthorized: Invalid token'));
    }
  });

  // 2. Xử lý sự kiện khi có Client kết nối thành công
  io.on('connection', (socket: AuthSocket) => {
    console.log(`🔌 User connected: ${socket.userId} (Socket ID: ${socket.id})`);

    // ==========================================
    // CHAT & ROOM
    // ==========================================
    
    socket.on('room:join', async (roomId: string) => {
      try {
        const member = await prisma.roomMember.findUnique({
          where: { roomId_userId: { roomId, userId: socket.userId! } },
        });

        if (!member) {
          socket.emit('error', { message: 'Bạn không phải là thành viên của phòng này' });
          return;
        }

        socket.join(roomId);
        console.log(`User ${socket.userId} joined room: ${roomId}`);
      } catch {
        socket.emit('error', { message: 'Lỗi khi tham gia phòng' });
      }
    });

    socket.on('chat:send', async (data: { roomId: string; content: string; clientId: string }) => {
      try {
        const { roomId, content, clientId } = data;
        const newMessage = await messageService.createMessage(roomId, socket.userId!, content, clientId);
        io.to(roomId).emit('chat:new_message', newMessage);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Lỗi khi gửi tin nhắn';
        socket.emit('error', { message: errorMessage });
      }
    });

    // ==========================================
    // WEBRTC VOICE SIGNALING (Phần mới thêm)
    // ==========================================

    // 1. Tham gia kênh thoại
    socket.on('voice:join', (roomId: string) => {
      socket.to(roomId).emit('voice:user_joined', socket.id, socket.userId);
      console.log(`User ${socket.userId} joined voice in room: ${roomId}`);
    });

    // 2. Chuyển tiếp Offer
    socket.on('voice:offer', (payload: { targetId: string; offer: unknown }) => {
      io.to(payload.targetId).emit('voice:offer', {
        fromId: socket.id,
        offer: payload.offer,
      });
    });

    // 3. Chuyển tiếp Answer
    socket.on('voice:answer', (payload: { targetId: string; answer: unknown }) => {
      io.to(payload.targetId).emit('voice:answer', {
        fromId: socket.id,
        answer: payload.answer,
      });
    });

    // 4. Chuyển tiếp ICE Candidates
    socket.on('voice:ice_candidate', (payload: { targetId: string; candidate: unknown }) => {
      io.to(payload.targetId).emit('voice:ice_candidate', {
        fromId: socket.id,
        candidate: payload.candidate,
      });
    });

    // 5. Rời kênh thoại
    socket.on('voice:leave', (roomId: string) => {
      socket.to(roomId).emit('voice:user_left', socket.id);
      console.log(`User ${socket.userId} left voice in room: ${roomId}`);
    });

    // Xử lý ngắt kết nối (Tắt tab, mất mạng)
    socket.on('disconnect', () => {
      console.log(`🔌 User disconnected: ${socket.userId}`);
      // Báo cho tất cả mọi người biết user này đã ngắt kết nối để dọn dẹp audio
      socket.broadcast.emit('voice:user_left', socket.id);
    });
  });
};
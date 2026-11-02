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
    // Client phải gửi token khi kết nối (qua socket.auth.token)
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
    console.log(`🔌 User connected to Socket: ${socket.userId} (Socket ID: ${socket.id})`);

    // Sự kiện: Tham gia vào phòng chat
    socket.on('room:join', async (roomId: string) => {
      try {
        // Kiểm tra xem user có phải thành viên phòng không
        const member = await prisma.roomMember.findUnique({
          where: { roomId_userId: { roomId, userId: socket.userId! } },
        });

        if (!member) {
          socket.emit('error', { message: 'Bạn không phải thành viên của phòng này' });
          return;
        }

        socket.join(roomId); // Cho socket vào channel của phòng
        console.log(`User ${socket.userId} joined room: ${roomId}`);
      } catch {
        socket.emit('error', { message: 'Lỗi khi tham gia phòng' });
      }
    });

    // Sự kiện: Gửi tin nhắn mới
    socket.on('chat:send', async (data: { roomId: string; content: string; clientId: string }) => {
      try {
        const { roomId, content, clientId } = data;

        // 1. Lưu tin nhắn vào Database thông qua Service của Tài
        const newMessage = await messageService.createMessage(
          roomId,
          socket.userId!,
          content,
          clientId
        );

        // 2. Phát lại (Broadcast) tin nhắn cho TẤT CẢ MỌI NGƯỜI trong phòng
        io.to(roomId).emit('chat:new_message', newMessage);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Lỗi khi gửi tin nhắn';
        socket.emit('error', { message: errorMessage });
      }
    });

    // Sự kiện: Ngắt kết nối
    socket.on('disconnect', () => {
      console.log(`🔌 User disconnected: ${socket.userId}`);
    });
  });
};
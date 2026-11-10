import { io, Socket } from 'socket.io-client';
import { getAccessToken } from './axios';

let socket: Socket | null = null;

export const connectSocket = () => {
  if (socket) return socket; // Tránh tạo nhiều kết nối
  
  const token = getAccessToken();
  if (!token) return null;

  socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000', {
    auth: { token },
    autoConnect: true,
  });

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
import type { Server } from 'socket.io';

// Giữ tham chiếu tới Socket.IO server để service layer (không phải socket handler)
// có thể emit sự kiện realtime mà không phải truyền `io` qua toàn bộ call stack.
let socketServer: Server | null = null;

export const setSocketServer = (io: Server): void => {
  socketServer = io;
};

export const getSocketServer = (): Server | null => socketServer;

/**
 * Emit tới mọi socket đang ở trong room.
 * No-op nếu server chưa khởi tạo (ví dụ khi chạy unit test service).
 */
export const emitToRoom = (
  roomId: string,
  event: string,
  payload: unknown
): void => {
  socketServer?.to(roomId).emit(event, payload);
};

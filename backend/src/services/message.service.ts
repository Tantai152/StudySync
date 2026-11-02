import { prisma } from '../config/prisma.js';

/**
 * Lấy lịch sử tin nhắn của phòng.
 * Kiểm tra quyền: userId phải là thành viên của phòng.
 * Cursor pagination dùng createdAt + id, sắp xếp ASC (tin nhắn mới nhất ở dưới cùng).
 *
 * @param roomId - ID phòng
 * @param userId - ID user hiện tại (để check quyền)
 * @param cursor - ID của tin nhắn cuối cùng đã load (dùng để phân trang)
 * @param limit - Số lượng tin nhắn mỗi trang (mặc định 50)
 */
export const getMessages = async (
  roomId: string,
  userId: string,
  cursor?: string,
  limit = 50
) => {
  // Kiểm tra quyền: userId phải là thành viên của phòng
  const membership = await prisma.roomMember.findUnique({
    where: { roomId_userId: { roomId, userId } },
  });

  if (!membership) {
    const error = new Error('FORBIDDEN') as Error & { statusCode: number };
    error.statusCode = 403;
    throw error;
  }

  // Lấy tin nhắn theo cursor pagination (ASC: tin nhắn cũ ở trên, mới ở dưới)
  const messages = await prisma.message.findMany({
    where: { roomId },
    orderBy: { createdAt: 'asc' },
    cursor: cursor ? { id: cursor } : undefined,
    skip: cursor ? 1 : 0,
    take: limit,
  });

  return messages.map((m) => ({
    id: m.id,
    clientId: m.clientId,
    content: m.content,
    roomId: m.roomId,
    senderId: m.senderId,
    createdAt: m.createdAt,
  }));
};

/**
 * Tạo tin nhắn mới trong phòng.
 * Kiểm tra quyền: userId phải là thành viên của phòng.
 *
 * @param roomId - ID phòng
 * @param userId - ID người gửi
 * @param content - Nội dung tin nhắn
 * @param clientId - Idempotency key (tùy chọn)
 */
export const createMessage = async (
  roomId: string,
  userId: string,
  content: string,
  clientId?: string
) => {
  // Kiểm tra quyền: userId phải là thành viên của phòng
  const membership = await prisma.roomMember.findUnique({
    where: { roomId_userId: { roomId, userId } },
  });

  if (!membership) {
    const error = new Error('FORBIDDEN') as Error & { statusCode: number };
    error.statusCode = 403;
    throw error;
  }

  // Tạo tin nhắn mới
  const message = await prisma.message.create({
    data: {
      content,
      roomId,
      senderId: userId,
      ...(clientId ? { clientId } : {}),
    },
  });

  return {
    id: message.id,
    clientId: message.clientId,
    content: message.content,
    roomId: message.roomId,
    senderId: message.senderId,
    createdAt: message.createdAt,
  };
};

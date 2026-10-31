import { prisma } from '../config/prisma.js';

// 1. Tìm kiếm người dùng theo tên hoặc email (trừ bản thân ra)
export const searchUsers = async (searchQuery: string, currentUserId: string) => {
  return await prisma.user.findMany({
    where: {
      AND: [
        { id: { not: currentUserId } }, // Không tìm thấy chính mình
        {
          OR: [
            { name: { contains: searchQuery } },
            { email: { contains: searchQuery } },
          ],
        },
      ],
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
    take: 10, // Giới hạn 10 kết quả
  });
};

// 2. Gửi lời mời kết bạn
export const sendFriendRequest = async (senderId: string, receiverId: string) => {
  if (senderId === receiverId) {
    throw new Error('Không thể tự kết bạn với chính mình');
  }

  // Kiểm tra xem đã là bạn bè chưa
  const existingFriendship = await prisma.friendship.findFirst({
    where: {
      OR: [
        { user1Id: senderId, user2Id: receiverId },
        { user1Id: receiverId, user2Id: senderId },
      ],
    },
  });
  if (existingFriendship) {
    throw new Error('Hai người đã là bạn bè');
  }

  // Kiểm tra xem đã có lời mời nào đang chờ chưa
  const existingRequest = await prisma.friendRequest.findFirst({
    where: {
      OR: [
        { senderId: senderId, receiverId: receiverId },
        { senderId: receiverId, receiverId: senderId },
      ],
      status: 'PENDING',
    },
  });
  if (existingRequest) {
    throw new Error('Đã có lời mời kết bạn đang chờ xử lý');
  }

  // Tạo lời mời mới
  return await prisma.friendRequest.create({
    data: {
      senderId,
      receiverId,
      status: 'PENDING',
    },
  });
};
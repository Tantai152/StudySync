import { prisma } from '../config/prisma.js';

export const createRoom = async (ownerId: string, name: string, description?: string) => {
  // Dùng transaction để đảm bảo tạo phòng và thêm thành viên cùng lúc
  return await prisma.$transaction(async (tx) => {
    const room = await tx.room.create({
      data: {
        name,
        description,
        ownerId,
      },
    });

    // Thêm chủ phòng vào bảng RoomMember với quyền OWNER
    await tx.roomMember.create({
      data: {
        roomId: room.id,
        userId: ownerId,
        role: 'OWNER',
      },
    });

    return room;
  });
};

export const getUserRooms = async (userId: string) => {
  return await prisma.room.findMany({
    where: {
      members: {
        some: { userId }, // Chỉ lấy những phòng mà user này là thành viên
      },
    },
    orderBy: { createdAt: 'desc' },
  });
};
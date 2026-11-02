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

export const getRoomMembers = async (roomId: string, requesterId: string) => {
  // Kiểm tra requester có phải là thành viên của phòng không
  const requesterMembership = await prisma.roomMember.findUnique({
    where: { roomId_userId: { roomId, userId: requesterId } },
  });

  if (!requesterMembership) {
    const error = new Error('FORBIDDEN') as Error & { statusCode: number };
    error.statusCode = 403;
    throw error;
  }

  // Lấy danh sách thành viên kèm thông tin User
  const members = await prisma.roomMember.findMany({
    where: { roomId },
    include: { user: { select: { id: true, email: true, name: true } } },
    orderBy: { joinedAt: 'asc' },
  });

  return members.map((m) => ({
    id: m.id,
    roomId: m.roomId,
    userId: m.userId,
    role: m.role,
    joinedAt: m.joinedAt,
    user: m.user,
  }));
};

export const kickMember = async (
  roomId: string,
  ownerId: string,
  targetUserId: string
) => {
  // Không được tự kick chính mình
  if (ownerId === targetUserId) {
    const error = new Error('Không thể tự kick chính mình') as Error & {
      statusCode: number;
    };
    error.statusCode = 400;
    throw error;
  }

  // Kiểm tra owner có phải là OWNER của phòng không
  const ownerMembership = await prisma.roomMember.findUnique({
    where: { roomId_userId: { roomId, userId: ownerId } },
  });

  if (!ownerMembership || ownerMembership.role !== 'OWNER') {
    const error = new Error(
      'Chỉ chủ phòng mới có quyền kick thành viên'
    ) as Error & { statusCode: number };
    error.statusCode = 403;
    throw error;
  }

  // Kiểm tra target có tồn tại trong phòng không
  const targetMembership = await prisma.roomMember.findUnique({
    where: { roomId_userId: { roomId, userId: targetUserId } },
  });

  if (!targetMembership) {
    const error = new Error(
      'Thành viên không tồn tại trong phòng'
    ) as Error & { statusCode: number };
    error.statusCode = 404;
    throw error;
  }

  // Xóa thành viên khỏi phòng
  await prisma.roomMember.delete({
    where: { roomId_userId: { roomId, userId: targetUserId } },
  });
};

export const leaveRoom = async (roomId: string, userId: string) => {
  // Kiểm tra user có phải là thành viên của phòng không
  const membership = await prisma.roomMember.findUnique({
    where: { roomId_userId: { roomId, userId } },
  });

  if (!membership) {
    const error = new Error(
      'Bạn không phải là thành viên của phòng này'
    ) as Error & { statusCode: number };
    error.statusCode = 404;
    throw error;
  }

  // Chặn OWNER rời phòng (MVP simplification)
  if (membership.role === 'OWNER') {
    const error = new Error(
      'Chủ phòng không thể rời phòng. Hãy xóa phòng nếu muốn thoát.'
    ) as Error & { statusCode: number };
    error.statusCode = 403;
    throw error;
  }

  // Xóa bản ghi thành viên của chính mình
  await prisma.roomMember.delete({
    where: { roomId_userId: { roomId, userId } },
  });
};
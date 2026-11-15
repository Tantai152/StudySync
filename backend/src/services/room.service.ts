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
    include: {
      user: { select: { id: true, email: true, name: true, avatarUrl: true } },
    },
    orderBy: { joinedAt: 'asc' },
  });

  // Lấy các phiên học đang ACTIVE của những thành viên này trong phòng.
  // (Kể cả PAUSED cũng là phiên chưa kết thúc, nhưng UI chỉ hiển thị ACTIVE.)
  const activeSessions = await prisma.studySession.findMany({
    where: {
      roomId,
      status: 'ACTIVE',
      userId: { in: members.map((m) => m.userId) },
    },
    orderBy: { startedAt: 'desc' },
  });

  const sessionByUser = new Map<string, (typeof activeSessions)[number]>();
  for (const session of activeSessions) {
    // Nếu có nhiều phiên ACTIVE bất thường, giữ phiên mới nhất.
    if (!sessionByUser.has(session.userId)) {
      sessionByUser.set(session.userId, session);
    }
  }

  return members.map((m) => {
    const session = sessionByUser.get(m.userId);
    return {
      // `id` ở đây là userId để frontend so khớp với currentUserId.
      id: m.userId,
      name: m.user.name,
      avatarUrl: m.user.avatarUrl,
      role: m.role,
      activeSession: session
        ? {
            goal: session.goal,
            duration: session.duration,
            lastResumedAt: session.lastResumedAt,
            startedAt: session.startedAt,
          }
        : null,
    };
  });
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

export const deleteRoom = async (roomId: string, ownerId: string) => {
  // Kiểm tra user có phải là thành viên OWNER của phòng không
  const membership = await prisma.roomMember.findUnique({
    where: { roomId_userId: { roomId, userId: ownerId } },
  });

  if (!membership) {
    const error = new Error('Phòng không tồn tại') as Error & {
      statusCode: number;
    };
    error.statusCode = 404;
    throw error;
  }

  if (membership.role !== 'OWNER') {
    const error = new Error(
      'Chỉ chủ phòng mới có quyền xóa phòng'
    ) as Error & { statusCode: number };
    error.statusCode = 403;
    throw error;
  }

  // Xóa phòng. Các bản ghi liên quan (members, invites, messages, sessions,
  // summaries, transcriptions) bị xóa theo nhờ onDelete: Cascade trong schema.
  await prisma.room.delete({
    where: { id: roomId },
  });
};

export const addMember = async (
  roomId: string,
  ownerId: string,
  userId: string
) => {
  // Không thể tự thêm chính mình
  if (ownerId === userId) {
    const error = new Error('Không thể tự thêm chính mình vào phòng') as Error & {
      statusCode: number;
    };
    error.statusCode = 400;
    throw error;
  }

  // Kiểm tra phòng tồn tại
  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) {
    const error = new Error('Phòng không tồn tại') as Error & {
      statusCode: number;
    };
    error.statusCode = 404;
    throw error;
  }

  // Chỉ OWNER mới được phép thêm thành viên
  const ownerMembership = await prisma.roomMember.findUnique({
    where: { roomId_userId: { roomId, userId: ownerId } },
  });

  if (!ownerMembership || ownerMembership.role !== 'OWNER') {
    const error = new Error(
      'Chỉ chủ phòng mới có quyền thêm thành viên'
    ) as Error & { statusCode: number };
    error.statusCode = 403;
    throw error;
  }

  // Kiểm tra user có phải là bạn bè của OWNER không
  const friendship = await prisma.friendship.findFirst({
    where: {
      OR: [
        { user1Id: ownerId, user2Id: userId },
        { user1Id: userId, user2Id: ownerId },
      ],
    },
  });

  if (!friendship) {
    const error = new Error('Người này chưa là bạn bè của bạn') as Error & {
      statusCode: number;
    };
    error.statusCode = 403;
    throw error;
  }

  // Idempotent: nếu đã trong phòng thì trả về thành công (không tạo trùng)
  const existingMembership = await prisma.roomMember.findUnique({
    where: { roomId_userId: { roomId, userId } },
  });

  if (existingMembership) {
    return { alreadyMember: true, roomId, userId };
  }

  // Thêm thành viên vào phòng với quyền MEMBER
  await prisma.roomMember.create({
    data: {
      roomId,
      userId,
      role: 'MEMBER',
    },
  });

  return { alreadyMember: false, roomId, userId };
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
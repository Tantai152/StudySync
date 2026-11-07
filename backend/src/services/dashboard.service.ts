import { prisma } from '../config/prisma.js';
import { computeStudyStats } from './studyStats.js';

export const getUserStats = async (userId: string) => {
  // 1. Tính tổng thời gian và tổng số phiên đã hoàn thành
  const aggregates = await prisma.studySession.aggregate({
    where: {
      userId,
      status: 'COMPLETED', // Chỉ tính những phiên đã kết thúc
    },
    _sum: {
      duration: true, // Tính tổng thời gian
    },
    _count: {
      id: true, // Đếm số phiên
    },
  });

  const totalSeconds = aggregates._sum.duration || 0;
  const totalSessions = aggregates._count.id || 0;

  // 2. Lấy danh sách 10 phiên học gần nhất
  const recentSessions = await prisma.studySession.findMany({
    where: {
      userId,
      status: 'COMPLETED',
    },
    orderBy: { endedAt: 'desc' },
    take: 10,
    select: {
      id: true,
      goal: true,
      duration: true,
      endedAt: true,
      room: { select: { name: true } }, // Lấy kèm tên phòng
    },
  });

  return {
    totalSeconds,
    totalSessions,
    recentSessions,
  };
};

export const getStudyStats = async (userId: string) => {
  // Lấy toàn bộ phiên đã hoàn thành để tính streak "từ trước đến nay".
  const sessions = await prisma.studySession.findMany({
    where: {
      userId,
      status: 'COMPLETED',
    },
    select: {
      startedAt: true,
      endedAt: true,
      duration: true,
    },
  });

  return computeStudyStats(sessions);
};
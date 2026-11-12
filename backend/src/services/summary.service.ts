import { prisma } from '../config/prisma.js';
import { generateSummary } from './groq.service.js';

const MAX_RECENT_MESSAGES = 50;
const MAX_STUDY_SESSIONS = 30;

export class SummaryError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly errorCode: string
  ) {
    super(message);
    this.name = 'SummaryError';
  }
}

const formatTime = (date: Date): string =>
  date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

const formatMinutes = (durationSeconds: number): string =>
  (durationSeconds / 60).toFixed(1);

/**
 * Gom dữ liệu của phòng (chat + voice transcription + study session),
 * gọi Groq LLM để tóm tắt và lưu vào bảng RoomSummary.
 *
 * Được gọi bởi timer 2 phút khi phòng không còn ai online.
 * Trả về null nếu phòng không có dữ liệu hoặc không còn tồn tại.
 */
export const processRoomSummary = async (roomId: string) => {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    select: { id: true, name: true },
  });

  if (!room) {
    console.warn(`[summary] Bỏ qua: phòng ${roomId} không tồn tại`);
    return null;
  }

  const [messages, transcriptions, sessions] = await Promise.all([
    prisma.message.findMany({
      where: { roomId },
      orderBy: { createdAt: 'desc' },
      take: MAX_RECENT_MESSAGES,
      include: { sender: { select: { name: true } } },
    }),
    prisma.transcription.findMany({
      where: { roomId },
      orderBy: { createdAt: 'asc' },
      include: { user: { select: { name: true } } },
    }),
    prisma.studySession.findMany({
      where: { roomId },
      orderBy: { startedAt: 'desc' },
      take: MAX_STUDY_SESSIONS,
      include: { user: { select: { name: true } } },
    }),
  ]);

  if (
    messages.length === 0 &&
    transcriptions.length === 0 &&
    sessions.length === 0
  ) {
    console.log(`[summary] Phòng ${roomId} không có dữ liệu để tóm tắt`);
    return null;
  }

  const sections: string[] = [`Phòng học: ${room.name}`];

  if (messages.length > 0) {
    const lines = [...messages]
      .reverse() // messages đang lấy mới nhất trước -> đảo lại theo thời gian
      .map(
        (message) =>
          `[${formatTime(message.createdAt)}] ${message.sender.name}: ${message.content}`
      );
    sections.push(`## Tin nhắn chat gần đây\n${lines.join('\n')}`);
  }

  if (transcriptions.length > 0) {
    const lines = transcriptions.map(
      (transcription) =>
        `[${formatTime(transcription.createdAt)}] ${transcription.user.name}: ${transcription.text}`
    );
    sections.push(`## Hội thoại voice (transcription)\n${lines.join('\n')}`);
  }

  if (sessions.length > 0) {
    const lines = sessions.map(
      (session) =>
        `- ${session.user.name}: mục tiêu "${
          session.goal ?? 'không đặt'
        }", học ${formatMinutes(session.duration)} phút, trạng thái ${
          session.status
        }, bắt đầu ${formatTime(session.startedAt)}`
    );
    sections.push(`## Phiên học của các thành viên\n${lines.join('\n')}`);
  }

  const content = await generateSummary(sections.join('\n\n'));

  if (!content) {
    console.warn(`[summary] Groq trả về nội dung rỗng cho phòng ${roomId}`);
    return null;
  }

  const summary = await prisma.roomSummary.create({
    data: { roomId, content },
  });

  // Dọn dẹp: các transcription đã được gom vào summary nên xoá để tránh
  // lần tóm tắt sau bị lặp lại nội dung cũ.
  try {
    await prisma.transcription.deleteMany({ where: { roomId } });
  } catch (error) {
    console.warn(
      `[summary] Không xoá được transcription của phòng ${roomId}:`,
      error instanceof Error ? error.message : 'unknown error'
    );
  }

  console.log(`[summary] Đã lưu tóm tắt ${summary.id} cho phòng ${roomId}`);
  return summary;
};

/**
 * Lấy summary mới nhất của phòng. Yêu cầu user là thành viên.
 */
export const getLatestSummary = async (roomId: string, userId: string) => {
  const membership = await prisma.roomMember.findUnique({
    where: { roomId_userId: { roomId, userId } },
  });

  if (!membership) {
    throw new SummaryError(
      'Bạn không phải là thành viên của phòng này',
      403,
      'FORBIDDEN'
    );
  }

  return prisma.roomSummary.findFirst({
    where: { roomId },
    orderBy: { createdAt: 'desc' },
  });
};

/**
 * Lấy danh sách bản tóm tắt mới nhất của tất cả các phòng
 * mà user hiện tại là thành viên.
 *
 * Trả về mảng [{ id, roomId, roomName, content, createdAt }],
 * sắp xếp theo createdAt giảm dần.
 *
 * @param userId - ID user hiện tại
 * @param limit - Số lượng bản tóm tắt tối đa (mặc định 10)
 */
export const getRoomSummariesByUser = async (
  userId: string,
  limit = 10
) => {
  // Lấy danh sách roomId mà user là thành viên
  const memberships = await prisma.roomMember.findMany({
    where: { userId },
    select: { roomId: true },
  });

  if (memberships.length === 0) {
    return [];
  }

  const roomIds = memberships.map((m) => m.roomId);

  const summaries = await prisma.roomSummary.findMany({
    where: { roomId: { in: roomIds } },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      room: { select: { id: true, name: true } },
    },
  });

  return summaries.map((s) => ({
    id: s.id,
    roomId: s.roomId,
    roomName: s.room.name,
    content: s.content,
    createdAt: s.createdAt,
  }));
};

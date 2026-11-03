import { prisma } from '../config/prisma.js';

export class StudySessionError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly errorCode: string
  ) {
    super(message);
    this.name = 'StudySessionError';
  }
}

function toDto(session: {
  id: string;
  userId: string;
  roomId: string;
  goal: string | null;
  status: string;
  startedAt: Date;
  endedAt: Date | null;
  lastResumedAt: Date | null;
  duration: number;
}) {
  return {
    id: session.id,
    userId: session.userId,
    roomId: session.roomId,
    goal: session.goal,
    status: session.status,
    startedAt: session.startedAt.toISOString(),
    endedAt: session.endedAt ? session.endedAt.toISOString() : null,
    lastResumedAt: session.lastResumedAt
      ? session.lastResumedAt.toISOString()
      : null,
    duration: session.duration,
  };
}

export const assertMembership = async (userId: string, roomId: string) => {
  const membership = await prisma.roomMember.findUnique({
    where: { roomId_userId: { roomId, userId } },
  });

  if (!membership) {
    const error = new StudySessionError(
      'You are not a member of this room',
      403,
      'NOT_A_MEMBER'
    );
    throw error;
  }
};

export const getOwnedSession = async (
  userId: string,
  roomId: string,
  sessionId: string
) => {
  const session = await prisma.studySession.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    const error = new StudySessionError(
      'Session not found',
      404,
      'SESSION_NOT_FOUND'
    );
    throw error;
  }

  if (session.userId !== userId) {
    const error = new StudySessionError(
      'This session does not belong to you',
      403,
      'FORBIDDEN'
    );
    throw error;
  }

  if (session.roomId !== roomId) {
    const error = new StudySessionError(
      'Session not found',
      404,
      'SESSION_NOT_FOUND'
    );
    throw error;
  }

  return session;
};

export const start = async (
  userId: string,
  roomId: string,
  goal?: string
) => {
  await assertMembership(userId, roomId);

  const existing = await prisma.studySession.findFirst({
    where: {
      userId,
      roomId,
      status: { in: ['ACTIVE', 'PAUSED'] },
    },
  });

  if (existing) {
    const message =
      existing.status === 'ACTIVE'
        ? 'Bạn đang có phiên học đang chạy trong phòng này'
        : 'Bạn đang có phiên học đang tạm dừng trong phòng này';
    const error = new StudySessionError(message, 409, 'SESSION_ALREADY_EXISTS');
    throw error;
  }

  const now = new Date();
  const session = await prisma.studySession.create({
    data: {
      userId,
      roomId,
      goal: goal?.trim() || null,
      status: 'ACTIVE',
      startedAt: now,
      lastResumedAt: now,
      duration: 0,
    },
  });

  return toDto(session);
};

export const pause = async (
  userId: string,
  roomId: string,
  sessionId: string
) => {
  await assertMembership(userId, roomId);
  const session = await getOwnedSession(userId, roomId, sessionId);

  if (session.status !== 'ACTIVE') {
    const error = new StudySessionError(
      'Only an ACTIVE session can be paused',
      400,
      'INVALID_STATE'
    );
    throw error;
  }

  const now = new Date();
  const elapsed = Math.floor((now.getTime() - session.lastResumedAt!.getTime()) / 1000);
  const addedDuration = Math.max(0, elapsed);

  const updated = await prisma.studySession.update({
    where: { id: sessionId },
    data: {
      status: 'PAUSED',
      duration: session.duration + addedDuration,
      lastResumedAt: null,
    },
  });

  return toDto(updated);
};

export const resume = async (
  userId: string,
  roomId: string,
  sessionId: string
) => {
  await assertMembership(userId, roomId);
  const session = await getOwnedSession(userId, roomId, sessionId);

  if (session.status !== 'PAUSED') {
    const error = new StudySessionError(
      'Only a PAUSED session can be resumed',
      400,
      'INVALID_STATE'
    );
    throw error;
  }

  const now = new Date();
  const updated = await prisma.studySession.update({
    where: { id: sessionId },
    data: {
      status: 'ACTIVE',
      lastResumedAt: now,
    },
  });

  return toDto(updated);
};

export const finish = async (
  userId: string,
  roomId: string,
  sessionId: string
) => {
  await assertMembership(userId, roomId);
  const session = await getOwnedSession(userId, roomId, sessionId);

  if (session.status === 'COMPLETED') {
    const error = new StudySessionError(
      'Session is already completed',
      400,
      'INVALID_STATE'
    );
    throw error;
  }

  const now = new Date();
  let finalDuration = session.duration;

  if (session.status === 'ACTIVE' && session.lastResumedAt != null) {
    const elapsed = Math.floor(
      (now.getTime() - session.lastResumedAt.getTime()) / 1000
    );
    finalDuration = session.duration + Math.max(0, elapsed);
  }

  const updated = await prisma.studySession.update({
    where: { id: sessionId },
    data: {
      status: 'COMPLETED',
      endedAt: now,
      duration: finalDuration,
      lastResumedAt: null,
    },
  });

  return toDto(updated);
};

export const current = async (userId: string, roomId: string) => {
  await assertMembership(userId, roomId);

  const session = await prisma.studySession.findFirst({
    where: {
      userId,
      roomId,
      status: { in: ['ACTIVE', 'PAUSED'] },
    },
    orderBy: { startedAt: 'desc' },
  });

  if (!session) {
    return null;
  }

  return toDto(session);
};

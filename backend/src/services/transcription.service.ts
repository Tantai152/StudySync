import { prisma } from '../config/prisma.js';
import { transcribeAudio } from './groq.service.js';

export class TranscriptionError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly errorCode: string
  ) {
    super(message);
    this.name = 'TranscriptionError';
  }
}

interface TranscribeInput {
  roomId: string;
  userId: string;
  fileBuffer: Buffer;
  fileName: string;
  language?: string;
}

/**
 * Kiểm tra quyền thành viên, gọi Groq Whisper và lưu kết quả vào DB.
 * Authorization nằm ở service layer theo quy ước của project.
 */
export const transcribeAndSave = async ({
  roomId,
  userId,
  fileBuffer,
  fileName,
  language = 'vi',
}: TranscribeInput) => {
  const membership = await prisma.roomMember.findUnique({
    where: { roomId_userId: { roomId, userId } },
  });

  if (!membership) {
    throw new TranscriptionError(
      'Bạn không phải là thành viên của phòng này',
      403,
      'FORBIDDEN'
    );
  }

  const text = await transcribeAudio(fileBuffer, fileName, language);

  // Đoạn im lặng/không có giọng nói trả về text rỗng -> không lưu rác vào DB.
  if (!text) {
    return { id: null, roomId, userId, text: '', createdAt: null };
  }

  const transcription = await prisma.transcription.create({
    data: { roomId, userId, text },
  });

  return {
    id: transcription.id,
    roomId: transcription.roomId,
    userId: transcription.userId,
    text: transcription.text,
    createdAt: transcription.createdAt,
  };
};

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { transcribeAndSave, TranscriptionError } from '../services/transcription.service.js';
import { GroqServiceError } from '../services/groq.service.js';

const paramsSchema = z.object({
  roomId: z.string().cuid('ID phòng không hợp lệ'),
});

const bodySchema = z.object({
  language: z.string().min(2).max(5).optional(),
});

const EXTENSION_BY_MIME: Record<string, string> = {
  'audio/webm': 'webm',
  'audio/ogg': 'ogg',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/mpeg': 'mp3',
  'audio/mp4': 'm4a',
  'audio/x-m4a': 'm4a',
};

/**
 * Đặt tên file có phần mở rộng đúng để Groq nhận diện định dạng.
 * Trình duyệt thường gửi file với tên "blob" nên không thể tin originalname.
 */
const resolveFileName = (originalName: string, mimetype: string): string => {
  const hasExtension = /\.[a-z0-9]{2,5}$/i.test(originalName);
  if (hasExtension) return originalName;

  const extension = EXTENSION_BY_MIME[mimetype] ?? 'webm';
  return `chunk-${Date.now()}.${extension}`;
};

/**
 * POST /api/v1/rooms/:roomId/transcribe
 * Nhận file audio (multipart field "audio"), chuyển thành text bằng Groq
 * Whisper, lưu vào bảng Transcription và trả về text.
 */
export const transcribeRoomAudio = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const parsedParams = paramsSchema.safeParse(req.params);
    if (!parsedParams.success) {
      return res.status(400).json({
        success: false,
        message: 'ID phòng không hợp lệ',
        errorCode: 'VALIDATION_ERROR',
        details: parsedParams.error.flatten().fieldErrors,
      });
    }

    const parsedBody = bodySchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu không hợp lệ',
        errorCode: 'VALIDATION_ERROR',
        details: parsedBody.error.flatten().fieldErrors,
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu file audio (field "audio")',
        errorCode: 'AUDIO_REQUIRED',
      });
    }

    const { roomId } = parsedParams.data;
    const userId = req.user!.userId;
    const fileName = resolveFileName(req.file.originalname, req.file.mimetype);

    const result = await transcribeAndSave({
      roomId,
      userId,
      fileBuffer: req.file.buffer,
      fileName,
      language: parsedBody.data.language ?? 'vi',
    });

    return res.status(201).json({ success: true, data: result });
  } catch (error) {
    if (error instanceof TranscriptionError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
        errorCode: error.errorCode,
      });
    }

    if (error instanceof GroqServiceError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
        errorCode: error.errorCode,
      });
    }

    next(error);
  }
};

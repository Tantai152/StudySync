import type { RequestHandler } from 'express';
import multer, { type MulterError } from 'multer';

// Groq Whisper giới hạn 25MB mỗi request.
const MAX_AUDIO_SIZE = 25 * 1024 * 1024;

const ALLOWED_MIME_PREFIXES = [
  'audio/',
  'video/webm',
  'application/octet-stream',
];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_AUDIO_SIZE,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    const isAllowed = ALLOWED_MIME_PREFIXES.some((prefix) =>
      file.mimetype.startsWith(prefix)
    );

    if (!isAllowed) {
      cb(new Error('UNSUPPORTED_AUDIO_TYPE'));
      return;
    }

    cb(null, true);
  },
});

/**
 * Nhận 1 file audio từ field "audio" (multipart/form-data) và giữ trong RAM.
 * Multer errors (quá dung lượng, sai định dạng, sai field) được chuyển thành
 * response 400 JSON thay vì rơi vào default error handler của Express.
 */
export const uploadAudio: RequestHandler = (req, res, next) => {
  upload.single('audio')(req, res, (error: unknown) => {
    if (!error) {
      next();
      return;
    }

    const multerError = error as MulterError;

    if (multerError.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({
        success: false,
        message: 'File audio vượt quá 25MB',
        errorCode: 'AUDIO_TOO_LARGE',
      });
      return;
    }

    if (multerError.code === 'LIMIT_UNEXPECTED_FILE') {
      res.status(400).json({
        success: false,
        message: 'Field file không hợp lệ, hãy dùng field "audio"',
        errorCode: 'INVALID_AUDIO_FIELD',
      });
      return;
    }

    res.status(400).json({
      success: false,
      message: 'Định dạng audio không được hỗ trợ',
      errorCode: 'UNSUPPORTED_AUDIO_TYPE',
    });
  });
};

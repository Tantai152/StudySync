import Groq from 'groq-sdk';
import { toFile } from 'groq-sdk/uploads';

const TRANSCRIPTION_MODEL = 'whisper-large-v3';
// `llama-3.3-70b-versatile` không còn khả dụng trên Groq (trả 404 model_not_found),
// nên dùng model chat đang được hỗ trợ và xử lý tiếng Việt tốt.
const SUMMARY_MODEL = 'openai/gpt-oss-120b';

const SUMMARY_SYSTEM_PROMPT = `Bạn là trợ lý học tập. Dưới đây là lịch sử chat và các đoạn hội thoại (transcription) của một phòng học. Hãy tóm tắt ngắn gọn (3-5 câu) xem buổi học đã thảo luận những gì, có những câu hỏi nào đã được giải đáp. Viết bằng tiếng Việt, giọng văn thân thiện, xưng hô 'mọi người'.`;

// Groq client is created once per process. If the key is missing we keep the
// client null so the rest of the API (auth, rooms, chat...) can still boot;
// only transcription requests will fail with a clear 503.
const groqClient = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null;

export class GroqServiceError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly errorCode: string
  ) {
    super(message);
    this.name = 'GroqServiceError';
  }
}

/**
 * Chuyển một đoạn audio thành text bằng Groq Whisper.
 *
 * @param fileBuffer - Nội dung file audio (ví dụ: blob webm từ MediaRecorder)
 * @param fileName - Tên file dùng để Groq nhận diện định dạng (vd: chunk.webm)
 * @param language - Mã ngôn ngữ ISO-639-1, mặc định 'vi'
 * @returns Text đã được trim (có thể rỗng nếu không nhận diện được giọng nói)
 */
export const transcribeAudio = async (
  fileBuffer: Buffer,
  fileName: string,
  language = 'vi'
): Promise<string> => {
  if (!groqClient) {
    throw new GroqServiceError(
      'GROQ_API_KEY chưa được cấu hình trên server',
      503,
      'GROQ_NOT_CONFIGURED'
    );
  }

  try {
    const file = await toFile(fileBuffer, fileName, { type: 'audio/webm' });

    const result = await groqClient.audio.transcriptions.create({
      file,
      model: TRANSCRIPTION_MODEL,
      language,
    });

    return (result.text ?? '').trim();
  } catch (error) {
    // Không log nội dung audio hay API key; chỉ log thông điệp lỗi.
    console.error(
      '[groq] transcription failed:',
      error instanceof Error ? error.message : 'unknown error'
    );
    throw new GroqServiceError(
      'Không thể chuyển audio thành text. Vui lòng thử lại.',
      502,
      'TRANSCRIPTION_FAILED'
    );
  }
};

/**
 * Tóm tắt nội dung một buổi học bằng Groq LLM.
 *
 * @param context - Lịch sử chat, transcription và study session đã được ghép thành text
 * @returns Nội dung tóm tắt tiếng Việt (3-5 câu)
 */
export const generateSummary = async (context: string): Promise<string> => {
  if (!groqClient) {
    throw new GroqServiceError(
      'GROQ_API_KEY chưa được cấu hình trên server',
      503,
      'GROQ_NOT_CONFIGURED'
    );
  }

  if (!context.trim()) {
    throw new GroqServiceError(
      'Không có dữ liệu để tóm tắt',
      400,
      'EMPTY_SUMMARY_CONTEXT'
    );
  }

  try {
    const completion = await groqClient.chat.completions.create({
      model: SUMMARY_MODEL,
      messages: [
        { role: 'system', content: SUMMARY_SYSTEM_PROMPT },
        { role: 'user', content: context },
      ],
      temperature: 0.4,
      max_tokens: 700,
    });

    return (completion.choices[0]?.message?.content ?? '').trim();
  } catch (error) {
    console.error(
      '[groq] summary generation failed:',
      error instanceof Error ? error.message : 'unknown error'
    );
    throw new GroqServiceError(
      'Không thể tạo tóm tắt cho phòng. Vui lòng thử lại.',
      502,
      'SUMMARY_FAILED'
    );
  }
};

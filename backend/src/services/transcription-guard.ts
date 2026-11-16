/**
 * Whisper (nhất là `language: 'vi'`) trả về câu "boilerplate" YouTube khi đoạn
 * audio gần như im lặng. Các câu này lặp y hệt giữa mọi phiên nên phải chặn ở
 * server, không thể dựa vào model.
 *
 * Mẫu khớp trên text đã bỏ dấu, nên viết không dấu. Dùng cụm CTA đầy đủ thay vì
 * từ khoá trần ("đăng ký kênh") để không nuốt câu nói thật.
 */
const HALLUCINATION_PATTERNS = [
  /subscribe cho kenh/,
  /hay subscribe/,
  /ghien mi go/,
  /dang ky kenh (de|nhe|de khong bo lo|ung ho)/,
  /nhan (vao )?nut (dang ky|subscribe)/,
  /khong bo lo nhung video/,
  /like va (chia se|dang ky)/,
];

const WHOLE_TEXT_BOILERPLATE = [
  'cảm ơn các bạn đã theo dõi',
  'cảm ơn các bạn đã xem video',
  'hẹn gặp lại các bạn trong video tiếp theo',
  'hẹn gặp lại',
];

const normalize = (text: string): string =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const isWhisperHallucination = (text: string): boolean => {
  const normalized = normalize(text);
  if (!normalized) return true;

  return (
    HALLUCINATION_PATTERNS.some((pattern) => pattern.test(normalized)) ||
    WHOLE_TEXT_BOILERPLATE.some(
      (phrase) => normalized === normalize(phrase)
    )
  );
};

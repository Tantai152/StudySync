import { z } from 'zod';

export const profileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Tên không được để trống')
    .max(50, 'Tên tối đa 50 ký tự'),
  avatarUrl: z.union([
    z.literal(''),
    z
      .string()
      .trim()
      .max(2048, 'URL ảnh quá dài')
      .url('URL ảnh không hợp lệ')
      .refine((value) => /^https?:\/\//i.test(value), {
        message: 'URL ảnh phải bắt đầu bằng http:// hoặc https://',
      }),
  ]),
});

export type ProfileFormData = z.infer<typeof profileSchema>;

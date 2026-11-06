import { z } from 'zod';

const avatarUrlSchema = z.union([
  z.literal(''),
  z
    .string()
    .trim()
    .min(1, 'Avatar URL không được để trống')
    .max(2048, 'Avatar URL quá dài')
    .url('Avatar URL không hợp lệ')
    .refine((value) => /^https?:\/\//i.test(value), {
      message: 'Avatar URL phải bắt đầu bằng http:// hoặc https://',
    }),
]);

export const updateProfileSchema = z.object({
  body: z
    .object({
      name: z
        .string()
        .trim()
        .min(1, 'Tên không được để trống')
        .max(50, 'Tên tối đa 50 ký tự')
        .optional(),
      avatarUrl: avatarUrlSchema.optional(),
    })
    .refine((data) => data.name !== undefined || data.avatarUrl !== undefined, {
      message: 'Cần cung cấp ít nhất một trường để cập nhật',
      path: ['name'],
    }),
});

export type UpdateProfileBody = z.infer<typeof updateProfileSchema>['body'];

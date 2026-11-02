import { z } from 'zod';

// Zod schema cho form tạo phòng mới
export const createRoomSchema = z
  .object({
    name: z.string().min(1, 'Tên phòng không được để trống').max(100, 'Tên phòng quá dài'),
    description: z.string().max(500, 'Mô tả quá dài').optional().or(z.literal('')),
  })
  .refine((data) => data.name.trim().length > 0, {
    message: 'Tên phòng không được chỉ là khoảng trắng',
    path: ['name'],
  });

export type CreateRoomFormData = z.infer<typeof createRoomSchema>;

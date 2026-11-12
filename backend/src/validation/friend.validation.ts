import { z } from 'zod';

export const searchUserSchema = z.object({
  query: z.object({
    query: z.string().min(2, 'Từ khóa tìm kiếm phải có ít nhất 2 ký tự'),
  }),
});

export const sendFriendRequestSchema = z.object({
  body: z.object({
    receiverId: z.string().min(1, 'ID người nhận không được để trống'),
  }),
});
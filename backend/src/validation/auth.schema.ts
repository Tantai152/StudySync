import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    name: z.string().min(1, 'Name cannot be empty').max(100, 'Name is too long'),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email'),
    password: z.string().min(1, 'Password cannot be empty'),
  }),
});

// Payload của access token. `userId` là field duy nhất bắt buộc vì
// token.service.ts hiện ký `{ userId }`; email/role để optional cho tương thích
// token cũ và cho các token không cần role.
export const accessTokenPayloadSchema = z.object({
  userId: z.string().min(1),
  email: z.string().optional(),
  role: z.string().optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>['body'];
export type LoginInput = z.infer<typeof loginSchema>['body'];
export type AccessTokenPayload = z.infer<typeof accessTokenPayloadSchema>;

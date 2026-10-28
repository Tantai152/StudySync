import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { Response } from 'express';
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';

// Hàm băm token để lưu vào DB an toàn (không ai đọc được kể cả khi lộ DB)
const hashToken = (token: string) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

export const generateTokens = async (userId: string, res: Response) => {
  // 1. Tạo Access Token (ngắn hạn, dùng để gọi API)
  const accessToken = jwt.sign({ userId }, env.JWT_ACCESS_SECRET, {
  expiresIn: env.ACCESS_TOKEN_EXPIRES_IN as jwt.SignOptions['expiresIn'], 
  });

  // 2. Tạo Refresh Token (dài hạn, dùng để lấy Access Token mới)
  const refreshToken = jwt.sign({ userId, jti: crypto.randomUUID() }, env.JWT_REFRESH_SECRET, {
  expiresIn: env.REFRESH_TOKEN_EXPIRES_IN as jwt.SignOptions['expiresIn'], 
  });

  // 3. Lưu Refresh Token (đã băm) vào Database
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // Mặc định 7 ngày

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashToken(refreshToken),
      expiresAt,
    },
  });

  // 4. Gắn Refresh Token vào Cookie HttpOnly (Trình duyệt giữ, JS không đọc được -> chống XSS)
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production', // Chỉ bật secure khi có HTTPS (production)
    sameSite: 'lax', // Chống CSRF cơ bản
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
  });

  return { accessToken, refreshToken };
};

export const verifyRefreshToken = async (token: string) => {
  try {
    const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as { userId: string };
    const tokenHash = hashToken(token);

    // Tìm token trong DB xem có hợp lệ và chưa bị thu hồi không
    const savedToken = await prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (!savedToken || savedToken.revokedAt || savedToken.expiresAt < new Date()) {
      return null; // Không hợp lệ hoặc đã hết hạn/bị thu hồi
    }

    return { userId: decoded.userId, tokenId: savedToken.id };
  } catch {
    return null;
  }
};


export const revokeRefreshToken = async (token: string) => {
  const tokenHash = hashToken(token);
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
};
import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma.js';
import { generateTokens } from '../services/token.service.js';
import { registerUser } from '../services/auth.service.js';

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password', errorCode: 'INVALID_CREDENTIALS' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password', errorCode: 'INVALID_CREDENTIALS' });
    }

    const { accessToken } = await generateTokens(user.id, res);

    res.status(200).json({
      success: true,
      data: {
        user: { id: user.id, email: user.email, name: user.name },
        accessToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, name } = req.body;
    const newUser = await registerUser({ email, password, name });
    
    res.status(201).json({
      success: true,
      data: { user: newUser },
    });
  } catch (error) {
    next(error);
  }
};

import { verifyRefreshToken, revokeRefreshToken } from '../services/token.service.js';

// API Làm mới Token
export const refresh = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.cookies;

    if (!refreshToken) {
      return res.status(401).json({ success: false, message: 'No refresh token provided', errorCode: 'NO_REFRESH_TOKEN' });
    }

    // 1. Kiểm tra token trong DB
    const validToken = await verifyRefreshToken(refreshToken);
    if (!validToken) {
      return res.status(401).json({ success: false, message: 'Invalid or expired refresh token', errorCode: 'INVALID_REFRESH_TOKEN' });
    }

    // 2. Thu hồi token cũ (Rotating Refresh Token - chống bị đánh cắp)
    await revokeRefreshToken(refreshToken);

    // 3. Cấp lại cặp token mới
    const { accessToken } = await generateTokens(validToken.userId, res);

    res.status(200).json({
      success: true,
      data: { accessToken },
    });
  } catch (error) {
    next(error);
  }
};

// API Đăng xuất
export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.cookies;

    // 1. Nếu có token, thu hồi nó trong DB
    if (refreshToken) {
      await revokeRefreshToken(refreshToken);
    }

    // 2. Xóa Cookie trên trình duyệt
    res.clearCookie('refreshToken');

    res.status(204).send(); // 204 No Content
  } catch (error) {
    next(error);
  }
};
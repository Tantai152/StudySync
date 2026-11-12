import type { Secret } from 'jsonwebtoken';
import { createRequire } from 'module';
import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';

const require = createRequire(import.meta.url);
const { verify } = require('jsonwebtoken');

/**
 * Authentication middleware.
 * Reads token from `Authorization: Bearer <token>` header,
 * verifies it with jwt.verify, and attaches payload to req.user.
 *
 * Returns 401 UNAUTHORIZED if token is missing or invalid.
 */
export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      message: 'Vui lòng đăng nhập để tiếp tục',
      errorCode: 'UNAUTHORIZED',
    });
    return;
  }

  const token = authHeader.slice(7); // Remove "Bearer " prefix

  try {
    const secret: Secret = env.JWT_ACCESS_SECRET;
    const payload = verify(token, secret) as {
      userId: string;
      email: string;
      role: string;
    };

    req.user = payload;
    next();
  } catch {
    res.status(401).json({
      success: false,
      message: 'Vui lòng đăng nhập để tiếp tục',
      errorCode: 'UNAUTHORIZED',
    });
  }
}

/**
 * Role-based authorization middleware factory.
 * Checks if req.user.role is included in the allowed roles list.
 *
 * Returns 403 FORBIDDEN if user does not have required role.
 */
export function authorize(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Bạn không có quyền thực hiện thao tác này',
        errorCode: 'FORBIDDEN',
      });
      return;
    }

    next();
  };
}

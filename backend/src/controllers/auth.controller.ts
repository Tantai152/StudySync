import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { registerUser, loginUser, AuthError } from '../services/auth.service.js';
import { RegisterInput, LoginInput } from '../validation/auth.schema.js';

export async function registerController(
  req: Request<unknown, unknown, RegisterInput>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = await registerUser(req.body);

    res.status(201).json({
      success: true,
      data: user,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
        errorCode: error.errorCode,
      });
      return;
    }

    if (error instanceof ZodError) {
      res.status(400).json({
        success: false,
        message: 'Invalid data',
        errorCode: 'VALIDATION_ERROR',
        details: error.flatten().fieldErrors,
      });
      return;
    }

    // Prisma unique constraint error (P2002) - fallback
    if (error instanceof Error && 'code' in error && error.code === 'P2002') {
      res.status(409).json({
        success: false,
        message: 'Email is already registered',
        errorCode: 'EMAIL_ALREADY_EXISTS',
      });
      return;
    }

    next(error);
  }
}

export async function loginController(
  req: Request<unknown, unknown, LoginInput>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = await loginUser(req.body);

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
        errorCode: error.errorCode,
      });
      return;
    }

    if (error instanceof ZodError) {
      res.status(400).json({
        success: false,
        message: 'Invalid data',
        errorCode: 'VALIDATION_ERROR',
        details: error.flatten().fieldErrors,
      });
      return;
    }

    next(error);
  }
}

export async function meController(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  res.status(200).json({
    success: true,
    data: req.user,
  });
}
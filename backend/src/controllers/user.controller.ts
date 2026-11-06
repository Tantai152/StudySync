import { Request, Response, NextFunction } from 'express';
import { updateUserProfile } from '../services/user.service.js';

export const updateProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = await updateUserProfile(req.user!.userId, req.body);

    res.status(200).json({
      success: true,
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

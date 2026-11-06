import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.js';
import { updateProfileSchema } from '../validation/user.schema.js';
import { updateProfile } from '../controllers/user.controller.js';

export const userRouter = Router();

userRouter.patch(
  '/users/profile',
  authenticate,
  validate(updateProfileSchema),
  updateProfile
);

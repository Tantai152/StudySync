import { Router } from 'express';
import { registerController, loginController, meController } from '../controllers/auth.controller.js';
import { registerSchema, loginSchema } from '../validation/auth.schema.js';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.middleware.js';

export const authRouter = Router();

authRouter.post(
  '/register',
  validate(registerSchema),
  registerController
);

authRouter.post(
  '/login',
  validate(loginSchema),
  loginController
);

authRouter.get('/me', authenticate, meController);
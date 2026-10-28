import { Router } from 'express';
import { login, meController, register } from '../controllers/auth.controller.js';
import { registerSchema, loginSchema } from '../validation/auth.schema.js';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.middleware.js';

export const authRouter = Router();

authRouter.post(
  '/register',
  validate(registerSchema),
  register
);

authRouter.post(
  '/login',
  validate(loginSchema),
  login
);

authRouter.get('/me', authenticate, meController);

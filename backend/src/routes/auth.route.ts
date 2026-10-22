import { Router } from 'express';
import { registerController, loginController } from '../controllers/auth.controller.js';
import { registerSchema, loginSchema } from '../validation/auth.schema.js';
import { validate } from '../middleware/validate.js';

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
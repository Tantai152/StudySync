import { Router } from 'express';
import { registerController } from '../controllers/auth.controller.js';
import { registerSchema } from '../validation/auth.schema.js';
import { validate } from '../middleware/validate.js';

export const authRouter = Router();

authRouter.post(
  '/register',
  validate(registerSchema),
  registerController
);
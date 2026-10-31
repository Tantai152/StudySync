import { Router } from 'express';
import { createInvite } from '../controllers/invite.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

export const inviteRouter = Router({ mergeParams: true });

inviteRouter.use(authenticate);

inviteRouter.post('/:id/invites', createInvite);
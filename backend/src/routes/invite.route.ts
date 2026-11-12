import { Router } from 'express';
import { createInvite, joinRoom } from '../controllers/invite.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

export const inviteRouter = Router({ mergeParams: true });

inviteRouter.use(authenticate);

// POST /api/v1/rooms/join — tham gia phòng qua token trong link mời
inviteRouter.post('/join', joinRoom);
inviteRouter.post('/:id/invites', createInvite);
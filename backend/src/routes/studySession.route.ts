import { Router } from 'express';
import {
  start,
  pause,
  resume,
  finish,
  current,
} from '../controllers/studySession.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router({ mergeParams: true });

router.get('/current', authenticate, current);
router.post('/start', authenticate, start);
router.patch('/:sessionId/pause', authenticate, pause);
router.patch('/:sessionId/resume', authenticate, resume);
router.patch('/:sessionId/finish', authenticate, finish);

export default router;

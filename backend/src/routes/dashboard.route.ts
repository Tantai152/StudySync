import { Router } from 'express';
import {
  getStats,
  getStudyStats,
} from '../controllers/dashboard.controller.js';
import { getUserSummaries } from '../controllers/summary.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

export const dashboardRouter = Router();

dashboardRouter.use(authenticate);
dashboardRouter.get('/stats', getStats);
dashboardRouter.get('/study-stats', getStudyStats);
dashboardRouter.get('/summaries', getUserSummaries);
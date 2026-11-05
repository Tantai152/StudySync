import { Router } from 'express';
import { getStats } from '../controllers/dashboard.controller.js';
import { getUserSummaries } from '../controllers/summary.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

export const dashboardRouter = Router();

dashboardRouter.use(authenticate);
dashboardRouter.get('/stats', getStats);
dashboardRouter.get('/summaries', getUserSummaries);
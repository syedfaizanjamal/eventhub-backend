import { Router } from 'express';
import * as analyticsController from '../controllers/analytics.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { ROLES } from '../constants';

const router = Router();

// Benchmark demonstration endpoint (public for easy experimentation & learning)
// GET /api/analytics/benchmark?useWorker=true&iterations=1500000
router.get('/benchmark', analyticsController.getBenchmark);

// Multi-thread demonstration endpoint (public for easy experimentation)
// GET /api/analytics/benchmark-parallel?threads=4&iterations=500000
router.get('/benchmark-parallel', analyticsController.getParallelBenchmark);

// Authenticated routes for Event Organizers and Admins
router.use(authenticate);
router.use(authorize(ROLES.ORGANIZER, ROLES.ADMIN));

// Event Analytics Report (Calculated via Worker Thread)
router.get('/events/:id', analyticsController.getEventReport);

// Event CSV Download (Formatted via Worker Thread)
router.get('/events/:id/csv', analyticsController.downloadEventReportCsv);

export default router;

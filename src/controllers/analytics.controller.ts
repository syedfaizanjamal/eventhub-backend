import { Request, Response, NextFunction } from 'express';
import * as analyticsService from '../services/analytics.service';

/**
 * Controller to handle Event Analytics & Reporting generated via Worker Threads
 */
export const getEventReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const report = await analyticsService.generateEventReport(id as string, req.user);

    res.status(200).json({
      success: true,
      message: 'Event analytics report generated successfully via Worker Thread',
      data: {
        summary: report.summary,
        metrics: report.metrics,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to download generated CSV report
 */
export const downloadEventReportCsv = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const report = await analyticsService.generateEventReport(id as string, req.user);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="event-${id}-analytics.csv"`);
    res.status(200).send(report.csv);
  } catch (error) {
    next(error);
  }
};

/**
 * Educational Benchmark Controller: Worker Thread vs Main Thread
 * Query params:
 * ?useWorker=true/false
 * ?iterations=1000000
 */
export const getBenchmark = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const iterations = parseInt(req.query.iterations as string, 10) || 500000;
    const useWorker = req.query.useWorker !== 'false'; // defaults to true

    const data = await analyticsService.runBenchmark(iterations, useWorker);

    res.status(200).json({
      success: true,
      data,
      howToTest: {
        workerMode: 'Run GET /api/analytics/benchmark?useWorker=true&iterations=1500000 and immediately open another tab hitting /api/health. Notice /api/health responds INSTANTLY because the main thread is NOT blocked!',
        syncMode: 'Run GET /api/analytics/benchmark?useWorker=false&iterations=1500000 and immediately open another tab hitting /api/health. Notice /api/health FREEZES/HANGS until the calculation completes, because the main thread was blocked!',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to test multiple parallel worker threads
 * Query params:
 * ?threads=4 (how many worker threads to spawn)
 * ?iterations=500000 (work per thread)
 */
export const getParallelBenchmark = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const threads = parseInt(req.query.threads as string, 10) || 4;
    const iterations = parseInt(req.query.iterations as string, 10) || 500000;

    const data = await analyticsService.runParallelBenchmark(threads, iterations);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};


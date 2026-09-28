import prisma from '../config/prisma';
import { AppError } from '../utils/appError';
import { ROLES } from '../constants';
import { runWorkerTask } from '../utils/workerHelper';

export interface EventReportResult {
  summary: {
    totalBookings: number;
    confirmedBookings: number;
    cancelledBookings: number;
    pendingBookings: number;
    totalSeatsCapacity: number;
    totalSeatsSold: number;
    remainingSeats: number;
    occupancyRatePercent: number;
    grossRevenue: number;
    refundedAmount: number;
    netRevenue: number;
    averageOrderValue: number;
    standardDeviation: number;
    percentiles: Record<string, number>;
    paymentModeBreakdown: Record<string, number>;
    dailySalesTrends: Record<string, { count: number; revenue: number; seats: number }>;
  };
  csv: string;
  metrics: {
    recordsProcessed: number;
    calculationDurationMs: number;
    processedByThread: string;
    threadId: number;
  };
}

/**
 * Generate Event Report using Node.js Worker Threads
 * 
 * 1. Main Thread handles Database I/O (fetching event & bookings via Prisma).
 * 2. CPU-heavy calculations (statistical percentiles, sales velocity, standard deviation, CSV generation)
 *    are dispatched to a separate Worker Thread.
 * 3. The Main Thread's Event Loop remains 100% responsive to serve other incoming HTTP requests.
 */
export const generateEventReport = async (
  eventId: string,
  user: { id: string; role: string }
): Promise<EventReportResult> => {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
  });

  if (!event || event.isDeleted) {
    throw new AppError('Event not found', 404);
  }

  // Authorization check
  if (user.role === ROLES.CUSTOMER) {
    throw new AppError('Forbidden: Customers cannot access organizer reports', 403);
  }
  if (user.role === ROLES.ORGANIZER && event.organizerId !== user.id) {
    throw new AppError('Forbidden: You can only view reports for your own events', 403);
  }

  // Fetch all bookings for this event (Database I/O)
  const bookings = await prisma.booking.findMany({
    where: { eventId },
    include: {
      user: {
        select: { name: true, email: true },
      },
      payment: {
        select: { status: true, paymentMode: true, amount: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  // Prepare serializable payload for worker thread
  const eventPayload = {
    id: event.id,
    title: event.title,
    totalSeats: event.totalSeats,
    availableSeats: event.availableSeats,
    price: event.price,
    date: event.date.toISOString(),
  };

  const bookingsPayload = bookings.map((b) => ({
    id: b.id,
    quantity: b.quantity,
    totalAmount: b.totalAmount,
    status: b.status,
    createdAt: b.createdAt.toISOString(),
    user: {
      name: b.user.name,
      email: b.user.email,
    },
    payment: b.payment
      ? {
        status: b.payment.status,
        paymentMode: b.payment.paymentMode,
        amount: b.payment.amount,
      }
      : null,
  }));

  // Offload CPU heavy calculations to worker thread
  const report = await runWorkerTask<any, EventReportResult>(
    'report.worker',
    {
      task: 'EVENT_REPORT',
      event: eventPayload,
      bookings: bookingsPayload,
    }
  );

  return report;
};

/**
 * CPU Benchmark Service for Learning & Comparison
 * 
 * Demonstrates:
 * - When useWorker = false: Calculates on Main Thread (blocks the event loop!)
 * - When useWorker = true: Calculates in Worker Thread (non-blocking!)
 */
export const runBenchmark = async (iterations: number = 500000, useWorker: boolean = true) => {
  const limit = Math.min(iterations, 2000000);

  if (useWorker) {
    // Run via Worker Thread
    const workerResult = await runWorkerTask(
      'report.worker',
      {
        task: 'CPU_BENCHMARK',
        iterations: limit,
      }
    );

    return {
      mode: 'WorkerThread',
      explanation: 'Task executed in a dedicated OS thread. The Node.js Event Loop remained completely free to handle other requests.',
      result: workerResult,
    };
  } else {
    // Run directly on Main Thread (Blocking Event Loop)
    const startTime = Date.now();
    let primeCount = 0;

    const isPrime = (n: number): boolean => {
      if (n <= 1) return false;
      if (n <= 3) return true;
      if (n % 2 === 0 || n % 3 === 0) return false;
      for (let i = 5; i * i <= n; i += 6) {
        if (n % i === 0 || n % (i + 2) === 0) return false;
      }
      return true;
    };

    for (let i = 2; i <= limit; i++) {
      if (isPrime(i)) {
        primeCount++;
      }
    }

    const durationMs = Date.now() - startTime;

    return {
      mode: 'MainThread (Sync / Blocking)',
      explanation: 'Task executed on the single main JavaScript thread. The Node.js Event Loop was BLOCKED for the entire duration!',
      result: {
        iterationsRun: limit,
        primesFound: primeCount,
        durationMs,
        processedByThread: 'MainThread',
        threadId: 0,
      },
    };
  }
};

/**
 * Multiple Worker Threads Demonstration
 * Spawns multiple worker threads concurrently using Promise.all
 * Each thread gets a unique threadId (e.g. 1, 2, 3, 4...) and executes in parallel
 */
export const runParallelBenchmark = async (threads: number = 4, iterations: number = 500000) => {
  const os = await import('os');
  const count = Math.min(Math.max(threads, 1), 16);
  const limit = Math.min(iterations, 2000000);
  const startTime = Date.now();

  // Spawn 'count' worker threads in parallel
  const workerPromises = Array.from({ length: count }, (_, index) =>
    runWorkerTask<any, any>('report.worker', {
      task: 'CPU_BENCHMARK',
      iterations: limit,
    }).then((res) => ({
      taskIndex: index + 1,
      ...res,
    }))
  );

  const results = await Promise.all(workerPromises);
  const totalDurationMs = Date.now() - startTime;

  return {
    threadsSpawned: count,
    availableCpuCores: os.cpus().length,
    cpuModel: os.cpus()[0]?.model || 'Unknown CPU',
    totalDurationMs,
    explanation: `Spawned ${count} separate Worker Threads simultaneously. Each thread ran on an OS thread with its own unique threadId.`,
    threads: results,
  };
};


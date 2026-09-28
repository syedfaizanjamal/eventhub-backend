import { parentPort, workerData } from 'worker_threads';

export interface BookingRecord {
  id: string;
  quantity: number;
  totalAmount: number;
  status: string;
  createdAt: string;
  user: {
    name: string;
    email: string;
  };
  payment?: {
    status: string;
    paymentMode: string;
    amount: number;
  } | null;
}

export interface EventData {
  id: string;
  title: string;
  totalSeats: number;
  availableSeats: number;
  price: number;
  date: string;
}

export interface WorkerInputPayload {
  task: 'EVENT_REPORT' | 'CPU_BENCHMARK';
  event?: EventData;
  bookings?: BookingRecord[];
  iterations?: number;
}

/**
 * Calculate numerical percentiles (e.g., 25th, 50th, 75th, 90th)
 */
function calculatePercentiles(values: number[]): Record<string, number> {
  if (values.length === 0) {
    return { p25: 0, p50: 0, p75: 0, p90: 0, p99: 0 };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const getP = (p: number) => {
    const idx = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(idx);
    const upper = Math.ceil(idx);
    const weight = idx - lower;
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  };

  return {
    p25: Number(getP(25).toFixed(2)),
    p50: Number(getP(50).toFixed(2)), // Median
    p75: Number(getP(75).toFixed(2)),
    p90: Number(getP(90).toFixed(2)),
    p99: Number(getP(99).toFixed(2)),
  };
}

/**
 * Generate formatted CSV representation of bookings and summary
 */
function generateCsvReport(event: EventData, bookings: BookingRecord[], summary: any): string {
  const lines: string[] = [];

  // Metadata headers
  lines.push(`"Event Title","${event.title.replace(/"/g, '""')}"`);
  lines.push(`"Event ID","${event.id}"`);
  lines.push(`"Event Date","${event.date}"`);
  lines.push(`"Total Capacity",${event.totalSeats}`);
  lines.push(`"Seats Sold",${summary.totalSeatsSold}`);
  lines.push(`"Occupancy Rate","${summary.occupancyRatePercent}%"`);
  lines.push(`"Gross Revenue (INR)",${summary.grossRevenue}`);
  lines.push(`"Net Revenue (INR)",${summary.netRevenue}`);
  lines.push(''); // Empty line

  // Column headers
  lines.push('"Booking ID","Customer Name","Customer Email","Quantity","Total Amount","Status","Payment Mode","Payment Status","Created At"');

  // Rows
  for (const b of bookings) {
    const row = [
      `"${b.id}"`,
      `"${(b.user?.name || '').replace(/"/g, '""')}"`,
      `"${(b.user?.email || '').replace(/"/g, '""')}"`,
      b.quantity,
      b.totalAmount,
      `"${b.status}"`,
      `"${b.payment?.paymentMode || 'N/A'}"`,
      `"${b.payment?.status || 'N/A'}"`,
      `"${b.createdAt}"`,
    ];
    lines.push(row.join(','));
  }

  return lines.join('\n');
}

/**
 * Event analytics report computation (CPU-intensive calculation)
 */
function processEventReport(event: EventData, bookings: BookingRecord[]) {
  const startTime = Date.now();

  let totalConfirmed = 0;
  let totalCancelled = 0;
  let totalPending = 0;
  let totalSeatsSold = 0;
  let grossRevenue = 0;
  let refundedAmount = 0;

  const amounts: number[] = [];
  const dailySales: Record<string, { count: number; revenue: number; seats: number }> = {};
  const paymentModeCounts: Record<string, number> = {};

  for (const b of bookings) {
    // Tally statuses
    if (b.status === 'CONFIRMED') {
      totalConfirmed++;
      totalSeatsSold += b.quantity;
      grossRevenue += b.totalAmount;
      amounts.push(b.totalAmount);
    } else if (b.status === 'CANCELLED') {
      totalCancelled++;
      if (b.payment?.status === 'REFUNDED') {
        refundedAmount += b.totalAmount;
      }
    } else if (b.status === 'PENDING') {
      totalPending++;
    }

    // Daily distribution
    const dateKey = b.createdAt ? b.createdAt.substring(0, 10) : 'unknown';
    if (!dailySales[dateKey]) {
      dailySales[dateKey] = { count: 0, revenue: 0, seats: 0 };
    }
    dailySales[dateKey].count++;
    if (b.status === 'CONFIRMED') {
      dailySales[dateKey].revenue += b.totalAmount;
      dailySales[dateKey].seats += b.quantity;
    }

    // Payment modes
    const mode = b.payment?.paymentMode || 'UNKNOWN';
    paymentModeCounts[mode] = (paymentModeCounts[mode] || 0) + 1;
  }

  const netRevenue = grossRevenue - refundedAmount;
  const occupancyRatePercent = event.totalSeats > 0
    ? Number(((totalSeatsSold / event.totalSeats) * 100).toFixed(2))
    : 0;

  const averageOrderValue = totalConfirmed > 0
    ? Number((grossRevenue / totalConfirmed).toFixed(2))
    : 0;

  // Calculate standard deviation of confirmed transaction values
  let stdDev = 0;
  if (amounts.length > 1) {
    const mean = grossRevenue / amounts.length;
    const variance = amounts.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / amounts.length;
    stdDev = Number(Math.sqrt(variance).toFixed(2));
  }

  const percentiles = calculatePercentiles(amounts);

  const summary = {
    totalBookings: bookings.length,
    confirmedBookings: totalConfirmed,
    cancelledBookings: totalCancelled,
    pendingBookings: totalPending,
    totalSeatsCapacity: event.totalSeats,
    totalSeatsSold,
    remainingSeats: Math.max(0, event.totalSeats - totalSeatsSold),
    occupancyRatePercent,
    grossRevenue: Number(grossRevenue.toFixed(2)),
    refundedAmount: Number(refundedAmount.toFixed(2)),
    netRevenue: Number(netRevenue.toFixed(2)),
    averageOrderValue,
    standardDeviation: stdDev,
    percentiles,
    paymentModeBreakdown: paymentModeCounts,
    dailySalesTrends: dailySales,
  };

  const csv = generateCsvReport(event, bookings, summary);
  const calculationDurationMs = Date.now() - startTime;

  return {
    summary,
    csv,
    metrics: {
      recordsProcessed: bookings.length,
      calculationDurationMs,
      processedByThread: 'WorkerThread',
      threadId: require('worker_threads').threadId,
    },
  };
}

/**
 * CPU benchmark simulation (e.g. counting primes or heavy numerical iteration)
 */
function runCpuBenchmark(iterations: number) {
  const startTime = Date.now();
  let primeCount = 0;

  // CPU-heavy operation: finding prime numbers up to iterations
  const isPrime = (n: number): boolean => {
    if (n <= 1) return false;
    if (n <= 3) return true;
    if (n % 2 === 0 || n % 3 === 0) return false;
    for (let i = 5; i * i <= n; i += 6) {
      if (n % i === 0 || n % (i + 2) === 0) return false;
    }
    return true;
  };

  const limit = Math.min(iterations, 2000000); // Guard limit to prevent infinite run
  for (let i = 2; i <= limit; i++) {
    if (isPrime(i)) {
      primeCount++;
    }
  }

  const durationMs = Date.now() - startTime;

  return {
    iterationsRun: limit,
    primesFound: primeCount,
    durationMs,
    processedByThread: 'WorkerThread',
    threadId: require('worker_threads').threadId,
  };
}

/**
 * Worker Main Execution Entrypoint
 */
try {
  const input = workerData as WorkerInputPayload;

  if (!input) {
    throw new Error('WorkerData was not provided to worker thread.');
  }

  let result: any;

  if (input.task === 'EVENT_REPORT') {
    if (!input.event || !input.bookings) {
      throw new Error('EVENT_REPORT task requires event and bookings in workerData.');
    }
    result = processEventReport(input.event, input.bookings);
  } else if (input.task === 'CPU_BENCHMARK') {
    result = runCpuBenchmark(input.iterations || 500000);
  } else {
    throw new Error(`Unknown task type: ${(input as any).task}`);
  }

  // Send successful result back to parent thread
  parentPort?.postMessage({
    success: true,
    data: result,
  });
} catch (error: any) {
  // Send error back to parent thread
  parentPort?.postMessage({
    success: false,
    error: error?.message || 'Worker thread encountered an unknown error',
  });
}

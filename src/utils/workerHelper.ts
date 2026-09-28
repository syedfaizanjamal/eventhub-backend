import { Worker } from 'worker_threads';
import path from 'path';

export interface WorkerTaskOptions {
  timeoutMs?: number;
}

export interface WorkerMessageResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Worker Thread Helper
 * 
 * Node.js Worker Threads allow executing CPU-intensive tasks on separate OS threads,
 * preventing the single-threaded Event Loop from blocking.
 * 
 * This helper provides a Promise-based abstraction that:
 * 1. Spawns a worker pointing to either TypeScript (.ts) in development or JavaScript (.js) in production.
 * 2. Uses ts-node/register/transpile-only when running in TypeScript development mode.
 * 3. Enforces a configurable timeout to kill rogue or hanging worker threads.
 * 4. Resolves with clean type-safe results.
 */
export const runWorkerTask = <TInput = any, TOutput = any>(
  workerFileName: string,
  workerData: TInput,
  options: WorkerTaskOptions = {}
): Promise<TOutput> => {
  return new Promise((resolve, reject) => {
    const { timeoutMs = 30000 } = options;

    // Detect if we are running in TypeScript (.ts) or compiled JavaScript (.js)
    const isTsEnvironment = __filename.endsWith('.ts');

    // Choose the appropriate worker file (.ts in dev, .js in production)
    const baseName = workerFileName.replace(/\.(ts|js)$/, '');
    const targetFile = `${baseName}.${isTsEnvironment ? 'ts' : 'js'}`;
    const workerPath = path.resolve(__dirname, '..', 'workers', targetFile);

    // If running in TypeScript mode (e.g. ts-node-dev), worker thread needs ts-node loader
    const execArgv = isTsEnvironment ? ['-r', 'ts-node/register/transpile-only'] : [];

    const worker = new Worker(workerPath, {
      workerData,
      execArgv,
    });

    let isSettled = false;

    // Set timeout to prevent worker from running indefinitely
    const timer = setTimeout(() => {
      if (!isSettled) {
        isSettled = true;
        worker.terminate().finally(() => {
          reject(new Error(`Worker thread timed out after ${timeoutMs}ms`));
        });
      }
    }, timeoutMs);

    // Listen for messages posted by the worker thread
    worker.on('message', (response: WorkerMessageResponse<TOutput>) => {
      if (isSettled) return;
      isSettled = true;
      clearTimeout(timer);

      if (response && response.success) {
        resolve(response.data as TOutput);
      } else {
        reject(new Error(response?.error || 'Worker thread execution failed'));
      }
    });

    // Listen for unhandled errors in the worker
    worker.on('error', (err: Error) => {
      if (isSettled) return;
      isSettled = true;
      clearTimeout(timer);
      reject(err);
    });

    // Listen for unexpected worker exit
    worker.on('exit', (code: number) => {
      if (isSettled) return;
      isSettled = true;
      clearTimeout(timer);

      if (code !== 0) {
        reject(new Error(`Worker stopped with non-zero exit code: ${code}`));
      }
    });
  });
};

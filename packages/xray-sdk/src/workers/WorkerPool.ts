/**
 * WorkerPool - Pool of worker threads for JSON serialization
 * Prevents main event loop blocking on large objects
 */

import { Worker } from "worker_threads";
import * as path from "path";

interface SerializeTask {
  id: string;
  data: unknown;
  resolve: (buffer: Buffer) => void;
  reject: (error: Error) => void;
}

interface WorkerState {
  worker: Worker;
  busy: boolean;
  currentTask: SerializeTask | null;
}

/**
 * WorkerPool manages a pool of worker threads for JSON serialization
 */
export class WorkerPool {
  private workers: WorkerState[] = [];
  private queue: SerializeTask[] = [];
  private poolSize: number;
  private workerScriptPath: string;
  private taskCounter = 0;

  constructor(poolSize: number) {
    this.poolSize = poolSize;
    // Worker script path - will be in dist/workers/serialize-worker.js after compilation
    // __dirname is already dist/workers/, so just join with the filename
    const workerFilename = "serialize-worker.js";
    this.workerScriptPath = path.join(__dirname, workerFilename);

    this.initializeWorkers();
  }

  /**
   * Initialize worker pool
   */
  private initializeWorkers(): void {
    for (let i = 0; i < this.poolSize; i++) {
      try {
        const worker = new Worker(this.workerScriptPath);
        const state: WorkerState = { worker, busy: false, currentTask: null };

        worker.on(
          "message",
          (result: {
            id: string;
            buffer: Buffer | null;
            error: string | null;
          }) => {
            const task = state.currentTask;
            state.busy = false;
            state.currentTask = null;

            if (task && task.id === result.id) {
              if (result.error) {
                task.reject(new Error(result.error));
              } else if (result.buffer) {
                task.resolve(result.buffer);
              } else {
                task.reject(new Error("Serialization failed"));
              }
            }

            // Process next task in queue
            this.processQueue();
          }
        );

        worker.on("error", (error) => {
          const task = state.currentTask;
          state.busy = false;
          state.currentTask = null;

          if (task) {
            task.reject(error);
          }
          this.processQueue();
        });

        worker.on("exit", (code) => {
          if (code !== 0) {
            const task = state.currentTask;
            state.busy = false;
            state.currentTask = null;

            if (task) {
              task.reject(new Error(`Worker exited with code ${code}`));
            }
            this.processQueue();
          }
        });

        this.workers.push(state);
      } catch (error) {
        // Worker creation failed - fallback to main thread serialization in serialize method
        console.warn("[WorkerPool] Failed to create worker:", error);
      }
    }
  }

  /**
   * Process queue - assign tasks to available workers
   */
  private processQueue(): void {
    if (this.queue.length === 0) {
      return;
    }

    const availableWorker = this.workers.find((w) => !w.busy);
    if (!availableWorker) {
      return; // All workers busy, wait for one to become available
    }

    const task = this.queue.shift();
    if (!task) {
      return;
    }

    availableWorker.busy = true;
    availableWorker.currentTask = task;

    try {
      availableWorker.worker.postMessage({ id: task.id, data: task.data });
    } catch (error) {
      availableWorker.busy = false;
      availableWorker.currentTask = null;
      task.reject(error instanceof Error ? error : new Error(String(error)));
      this.processQueue();
    }
  }

  /**
   * Serialize data to Buffer using a worker thread
   * @param data Data to serialize
   * @returns Promise that resolves to serialized Buffer
   */
  async serialize(data: unknown): Promise<Buffer> {
    // Fallback to main thread serialization if no workers available
    if (this.workers.length === 0) {
      try {
        const jsonString = JSON.stringify(data);
        return Buffer.from(jsonString, "utf-8");
      } catch (error) {
        throw error instanceof Error ? error : new Error(String(error));
      }
    }

    // Generate unique task ID
    const taskId = `task-${++this.taskCounter}-${Date.now()}`;

    return new Promise<Buffer>((resolve, reject) => {
      const task: SerializeTask = {
        id: taskId,
        data,
        resolve,
        reject,
      };

      this.queue.push(task);
      this.processQueue();
    });
  }

  /**
   * Gracefully shutdown all workers
   */
  async shutdown(): Promise<void> {
    // Wait for queue to drain
    while (this.queue.length > 0 || this.workers.some((w) => w.busy)) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    // Terminate all workers
    const shutdownPromises = this.workers.map((state) => {
      return new Promise<void>((resolve) => {
        state.worker
          .terminate()
          .then(() => resolve())
          .catch(() => resolve());
      });
    });

    await Promise.all(shutdownPromises);
    this.workers = [];
    this.queue = [];
  }
}

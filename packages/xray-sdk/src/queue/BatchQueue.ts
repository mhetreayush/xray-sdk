/**
 * BatchQueue - Queues events and flushes them in batches
 * Flushes when batchInterval is reached OR maxBatchSize is reached (whichever first)
 * Interval starts on first event added, clears when queue is empty
 */

import { Event } from "../types";

export type FlushHandler = (events: Event[]) => Promise<void>;

/**
 * BatchQueue manages batching of events for upload
 */
export class BatchQueue {
  private events: Event[] = [];
  private interval: NodeJS.Timeout | null = null;
  private batchInterval: number;
  private maxBatchSize: number;
  private flushHandler: FlushHandler;
  private isProcessing = false;

  constructor(
    batchInterval: number,
    maxBatchSize: number,
    flushHandler: FlushHandler
  ) {
    this.batchInterval = batchInterval;
    this.maxBatchSize = maxBatchSize;
    this.flushHandler = flushHandler;
  }

  /**
   * Add event to queue
   * Starts interval on first event, flushes if maxBatchSize reached
   */
  add(event: Event): void {
    this.events.push(event);

    // Start interval on first event
    if (!this.interval && this.events.length === 1) {
      this.startInterval();
    }

    // Flush if maxBatchSize reached
    if (this.events.length >= this.maxBatchSize) {
      this.flush();
    }
  }

  /**
   * Start interval timer
   */
  private startInterval(): void {
    if (this.interval) {
      return; // Already running
    }

    this.interval = setInterval(() => {
      if (this.events.length > 0 && !this.isProcessing) {
        this.flush();
      }
    }, this.batchInterval);
  }

  /**
   * Clear interval timer
   */
  private clearInterval(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  /**
   * Flush events from queue
   * Writes batch to storage and calls flushHandler
   */
  private async flush(): Promise<void> {
    if (this.isProcessing || this.events.length === 0) {
      return;
    }

    this.isProcessing = true;
    const batch = [...this.events];
    this.events = [];

    // Clear interval - will restart if new events added
    this.clearInterval();

    try {
      await this.flushHandler(batch);
    } catch (error) {
      // Re-queue events on failure
      this.events.unshift(...batch);

      // Restart interval if queue has events
      if (this.events.length > 0 && !this.interval) {
        this.startInterval();
      }
    } finally {
      this.isProcessing = false;

      // Clear interval when queue is empty
      if (this.events.length === 0) {
        this.clearInterval();
      }
    }
  }

  /**
   * Get current queue size
   */
  getSize(): number {
    return this.events.length;
  }

  /**
   * Force flush (for shutdown)
   */
  async forceFlush(): Promise<void> {
    this.clearInterval();

    while (this.events.length > 0) {
      await this.flush();
    }
  }

  /**
   * Shutdown - flush remaining events
   */
  async shutdown(): Promise<void> {
    await this.forceFlush();
  }
}

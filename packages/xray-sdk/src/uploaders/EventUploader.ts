/**
 * EventUploader - Handles event uploads (batched via BatchQueue)
 * Writes batches to storage, sends to ingest endpoint, retries on failure
 */

import { randomUUID } from "crypto";
import { StorageAdapter } from "../storage/StorageAdapter";
import { BatchQueue } from "../queue/BatchQueue";
import { ApiClient } from "../api";
import { Event, IngestRequest } from "../types";
import { DebugLogger } from "../utils/debug";

/**
 * EventUploader handles batched upload of events
 */
export class EventUploader {
  private storage: StorageAdapter;
  private batchQueue: BatchQueue;
  private apiClient: ApiClient;
  private debug: DebugLogger;

  constructor(
    storage: StorageAdapter,
    apiClient: ApiClient,
    batchInterval: number,
    maxBatchSize: number,
    debug: boolean = false
  ) {
    this.storage = storage;
    this.apiClient = apiClient;
    this.debug = new DebugLogger(debug);

    // Create batch queue with flush handler
    this.batchQueue = new BatchQueue(batchInterval, maxBatchSize, (events) =>
      this.handleFlush(events)
    );
  }

  /**
   * Add event to batch queue (non-blocking)
   */
  addEvent(event: Event): void {
    this.debug.debug(
      `[EventUploader] addEvent() called: type=${event.type}, traceId=${event.traceId}`
    );
    this.batchQueue.add(event);
  }

  /**
   * Handle batch flush - write to storage, upload, delete on success
   */
  private async handleFlush(events: Event[]): Promise<void> {
    if (events.length === 0) {
      return;
    }

    const batchId = randomUUID();
    const storageId = `events-${batchId}`;

    try {
      // 1. Serialize batch to JSON
      const batchJson = JSON.stringify(events);
      const buffer = Buffer.from(batchJson, "utf-8");

      // 2. Write batch to local storage
      await this.storage.write(storageId, buffer, "events");

      try {
        // 3. Send batch to ingest endpoint
        const ingestRequest: IngestRequest = {
          events,
        };

        await this.apiClient.ingest(ingestRequest);

        this.debug.log(
          `[EventUploader] Batch upload successful: batchId=${batchId}, events=${events.length}`
        );

        // 4. Delete local file on success (don't fail upload if delete fails)
        try {
          await this.storage.delete(storageId);
          this.debug.log(
            `[EventUploader] Deleted file after successful upload: storageId=${storageId}`
          );
        } catch (deleteError) {
          // Log delete error but don't fail the upload
          this.debug.warn(
            `[EventUploader] Failed to delete file after successful upload: storageId=${storageId}`,
            deleteError
          );
        }
      } catch (uploadError) {
        // On failure, file stays on disk (will be retried or cleaned up by FIFO)
        this.debug.warn(`[EventUploader] Batch upload failed:`, uploadError);
        throw uploadError;
      }
    } catch (error) {
      // Error handling: log if debug, otherwise silent
      // BatchQueue will re-queue events on failure
      this.debug.warn(`[EventUploader] Batch upload failed:`, error);
      throw error; // Re-throw so BatchQueue can re-queue
    }
  }

  /**
   * Force flush all pending events (for shutdown/testing)
   */
  async forceFlush(): Promise<void> {
    await this.batchQueue.forceFlush();
  }

  /**
   * Shutdown event uploader gracefully
   */
  async shutdown(): Promise<void> {
    await this.batchQueue.forceFlush();
  }
}

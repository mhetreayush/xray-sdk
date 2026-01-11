/**
 * BaseTracer - Main entry point for X-Ray SDK
 * Initializes storage, worker pool, uploaders, and creates trace instances
 */

import { tmpdir } from "os";
import { join } from "path";
import { randomUUID } from "crypto";
import { BaseTracerConfig, TraceOptions, TraceStartEvent } from "../types";
import { DiskStorage } from "../storage/DiskStorage";
import { MemoryStorage } from "../storage/MemoryStorage";
import { StorageAdapter } from "../storage/StorageAdapter";
import { WorkerPool } from "../workers/WorkerPool";
import { ApiClient } from "../api";
import { DataUploader } from "../uploaders/DataUploader";
import { EventUploader } from "../uploaders/EventUploader";
import { Trace } from "./Trace";
import { DebugLogger } from "../utils/debug";

/**
 * BaseTracer - Main SDK entry point
 */
export class BaseTracer {
  private config: Required<BaseTracerConfig>;
  private storage: StorageAdapter;
  private workerPool: WorkerPool;
  private apiClient: ApiClient;
  private dataUploader!: DataUploader;
  private eventUploader!: EventUploader;
  private debug: DebugLogger;

  constructor(config: BaseTracerConfig) {
    // Apply defaults
    this.config = {
      enabled: config.enabled ?? true,
      debug: config.debug ?? false,
      baseUrl:
        config.baseUrl ?? process.env.XRAY_BASE_URL ?? "http://localhost:3000",
      tempDir: config.tempDir ?? this.detectTempDir(),
      maxDiskSize: config.maxDiskSize ?? 2 * 1024 * 1024 * 1024, // 2GB
      maxMemorySize: config.maxMemorySize ?? 50 * 1024 * 1024, // 50MB
      batchInterval: config.batchInterval ?? 1000, // 1 second
      maxBatchSize: config.maxBatchSize ?? 50,
      workerPoolSize: config.workerPoolSize ?? 2,
      apiKey: config.apiKey,
      projectId: config.projectId,
    };

    this.debug = new DebugLogger(this.config.debug);

    this.debug.log(
      `[BaseTracer] Initializing: enabled=${this.config.enabled}, debug=${this.config.debug}, baseUrl=${this.config.baseUrl}`
    );
    this.debug.log(
      `[BaseTracer] Temp files will be written to: ${this.config.tempDir}`
    );

    // Initialize storage (DiskStorage with async initialization)
    this.storage = new DiskStorage(
      this.config.tempDir,
      this.config.maxDiskSize
    );

    // Initialize storage directory asynchronously (don't block constructor)
    this.initializeStorage().catch((error) => {
      // Fallback to MemoryStorage if initialization fails
      this.debug.warn(
        "[BaseTracer] DiskStorage initialization failed, falling back to MemoryStorage:",
        error
      );
      this.storage = new MemoryStorage(this.config.maxMemorySize);
      // Recreate uploaders with new storage
      this.recreateUploaders();
    });

    // Initialize worker pool
    this.workerPool = new WorkerPool(this.config.workerPoolSize);

    // Initialize API client
    this.apiClient = new ApiClient(
      this.config.baseUrl,
      this.config.apiKey,
      this.config.debug
    );

    // Initialize uploaders
    this.recreateUploaders();

    // Setup graceful shutdown
    this.setupShutdownHandlers();
  }

  /**
   * Detect temporary directory
   * Default: os.tmpdir()/xray
   */
  private detectTempDir(): string {
    return join(tmpdir(), "xray");
  }

  /**
   * Initialize storage directory asynchronously
   */
  private async initializeStorage(): Promise<void> {
    if (this.storage instanceof DiskStorage) {
      await this.storage.initialize();
    }
  }

  /**
   * Recreate uploaders with current storage
   */
  private recreateUploaders(): void {
    this.dataUploader = new DataUploader(
      this.storage,
      this.workerPool,
      this.apiClient,
      this.config.debug
    );

    this.eventUploader = new EventUploader(
      this.storage,
      this.apiClient,
      this.config.batchInterval,
      this.config.maxBatchSize,
      this.config.debug
    );
  }

  /**
   * Create a new trace instance
   */
  createTrace(options?: TraceOptions): Trace {
    if (!this.config.enabled) {
      // Return no-op trace instance
      return new Trace(
        "",
        this.config.projectId,
        this.dataUploader,
        this.eventUploader,
        false, // disabled
        this.debug
      );
    }

    const traceId = `${this.config.projectId}-${randomUUID()}`;

    this.debug.log(
      `[BaseTracer] createTrace() called: traceId=${traceId}, projectId=${this.config.projectId}`
    );

    // Create trace-start event
    const startEvent: TraceStartEvent = {
      type: "trace-start",
      traceId,
      projectId: this.config.projectId,
      metadata: options?.metadata ?? {},
      createdAt: Date.now(),
    };

    // Send trace-start event (non-blocking)
    this.eventUploader.addEvent(startEvent);

    // Create and return trace instance
    return new Trace(
      traceId,
      this.config.projectId,
      this.dataUploader,
      this.eventUploader,
      true, // enabled
      this.debug
    );
  }

  /**
   * Setup graceful shutdown handlers
   */
  private setupShutdownHandlers(): void {
    const shutdown = async () => {
      this.debug.log("[BaseTracer] Shutting down...");
      try {
        // Flush pending events
        await this.eventUploader.forceFlush();
        // Wait for pending data uploads
        await this.dataUploader.waitForPendingUploads();
        // Shutdown worker pool
        await this.workerPool.shutdown();
        this.debug.log("[BaseTracer] Shutdown complete");
      } catch (error) {
        this.debug.error("[BaseTracer] Error during shutdown:", error);
      }
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  }

  /**
   * Get storage adapter (for testing/debugging)
   */
  getStorage(): StorageAdapter {
    return this.storage;
  }
}

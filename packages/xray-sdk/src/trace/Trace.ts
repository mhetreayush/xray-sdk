/**
 * Trace - Trace instance for a single pipeline run
 * Holds traceId, stepNumber counter, and methods for recording steps/data
 */

import { randomUUID } from "crypto";
import { DataUploader } from "../uploaders/DataUploader";
import { EventUploader } from "../uploaders/EventUploader";
import {
  StepOptions,
  ErrorOptions,
  EndOptions,
  CaptureOptions,
  StepEvent,
  TraceSuccessEvent,
  TraceFailureEvent,
} from "../types";
import { DebugLogger } from "../utils/debug";

/**
 * Trace instance for a single pipeline run
 */
export class Trace {
  readonly traceId: string;
  private projectId: string;
  private dataUploader: DataUploader;
  private eventUploader: EventUploader;
  private enabled: boolean;
  private currentStepNumber: number;
  private ended: boolean;
  private debug: DebugLogger;

  constructor(
    traceId: string,
    projectId: string,
    dataUploader: DataUploader,
    eventUploader: EventUploader,
    enabled: boolean = true,
    debug: DebugLogger | boolean = false
  ) {
    this.traceId = traceId;
    this.projectId = projectId;
    this.dataUploader = dataUploader;
    this.eventUploader = eventUploader;
    this.enabled = enabled;
    this.currentStepNumber = 0; // Starts at 0, first step becomes 1
    this.ended = false;
    this.debug = debug instanceof DebugLogger ? debug : new DebugLogger(debug);
  }

  /**
   * Store data blob and return dataId immediately (fire-and-forget)
   * Generates dataId locally, upload happens in background
   */
  dataId(
    data: unknown,
    key: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    metadata?: Record<string, any>
  ): string {
    if (!this.enabled) {
      return randomUUID(); // Return dummy ID for no-op
    }

    // Generate dataId locally (no network call)
    const dataId = randomUUID();

    this.debug.log(
      `[Trace] dataId() called: traceId=${this.traceId}, dataId=${dataId}, key=${key}`
    );

    // Start upload in background (fire-and-forget, don't await)
    this.dataUploader
      .upload(this.traceId, data, key, dataId, metadata)
      .catch(() => {
        // Errors handled internally by DataUploader, silent failure
      });

    // Return dataId immediately
    return dataId;
  }

  /**
   * Record a step
   */
  step(options: StepOptions): void {
    if (!this.enabled) {
      return;
    }

    // Determine step number
    let stepNumber: number;
    if (options.stepNumber !== undefined) {
      stepNumber = options.stepNumber;
      // Update counter to max(existing, provided)
      this.currentStepNumber = Math.max(this.currentStepNumber, stepNumber);
    } else {
      // Auto-increment
      this.currentStepNumber++;
      stepNumber = this.currentStepNumber;
    }

    // Create step event
    const stepEvent: StepEvent = {
      type: "step",
      stepId: randomUUID(),
      traceId: this.traceId,
      projectId: this.projectId,
      stepName: options.stepName,
      stepNumber,
      artifacts:
        options.artifacts?.map((a) => ({
          dataId: a.dataId,
          type: a.type ?? null,
        })) ?? [],
      metadata: options.metadata ?? {},
      timestamp: Date.now(),
    };

    this.debug.log(
      `[Trace] step() called: traceId=${this.traceId}, stepName=${
        options.stepName
      }, stepNumber=${stepNumber}, artifacts=${options.artifacts?.length ?? 0}`
    );

    // Send event (non-blocking)
    this.eventUploader.addEvent(stepEvent);
  }

  /**
   * Record an error (convenience method - internally calls step with error metadata)
   */
  error(options: ErrorOptions): void {
    if (!this.enabled) {
      return;
    }

    const errorObj =
      options.error instanceof Error ? options.error : new Error(options.error);
    const errorMessage = errorObj.message;
    const errorStack = errorObj.stack;

    this.debug.log(
      `[Trace] error() called: traceId=${this.traceId}, error=${errorMessage}`
    );

    // Call step with error metadata (error is just a step with type "step-error")
    this.step({
      stepName: "error", // Use "error" as step name
      metadata: {
        error: errorMessage,
        stack: errorStack,
        ...(options.metadata ?? {}),
      },
    });
  }

  /**
   * End trace with success status
   */
  success(options?: EndOptions): void {
    if (!this.enabled || this.ended) {
      return;
    }

    this.ended = true;

    this.debug.log(`[Trace] success() called: traceId=${this.traceId}`);

    // Create trace-success event
    const successEvent: TraceSuccessEvent = {
      type: "trace-success",
      traceId: this.traceId,
      projectId: this.projectId,
      metadata: {},
      successMetadata: options?.metadata ?? {},
      status: "success",
      createdAt: Date.now(),
      endedAt: Date.now(),
    };

    // Send event (non-blocking)
    this.eventUploader.addEvent(successEvent);
  }

  /**
   * End trace with failure status
   */
  failure(options?: EndOptions): void {
    if (!this.enabled || this.ended) {
      return;
    }

    this.ended = true;

    this.debug.log(`[Trace] failure() called: traceId=${this.traceId}`);

    // Create trace-failure event
    const failureEvent: TraceFailureEvent = {
      type: "trace-failure",
      traceId: this.traceId,
      projectId: this.projectId,
      metadata: {},
      failureMetadata: options?.metadata ?? {},
      status: "failure",
      createdAt: Date.now(),
      endedAt: Date.now(),
    };

    // Send event (non-blocking)
    this.eventUploader.addEvent(failureEvent);
  }

  /**
   * Minimal mode - step with inline data
   * Generates dataIds locally, uploads happen in background (non-blocking)
   */
  capture(options: CaptureOptions): void {
    if (!this.enabled) {
      return;
    }

    // Generate dataIds locally (no awaiting)
    const dataIds = options.artifacts.map((artifact) =>
      this.dataId(artifact.data, artifact.key)
    );

    const stepNumber = this.currentStepNumber + 1;
    this.debug.log(
      `[Trace] capture() called: traceId=${this.traceId}, stepName=${options.stepName}, stepNumber=${stepNumber}, artifacts=${options.artifacts.length}`
    );

    // Create artifacts array with type: null (no input/output distinction)
    // We need to create StepEvent directly since StepOptions doesn't accept null type
    const stepEvent: StepEvent = {
      type: "step",
      stepId: randomUUID(),
      traceId: this.traceId,
      projectId: this.projectId,
      stepName: options.stepName,
      stepNumber: ++this.currentStepNumber, // Auto-increment
      artifacts: options.artifacts.map((artifact, index) => ({
        dataId: dataIds[index],
        type: null,
      })),
      metadata: options.metadata ?? {},
      timestamp: Date.now(),
    };

    // Send event (non-blocking)
    this.eventUploader.addEvent(stepEvent);
  }
}

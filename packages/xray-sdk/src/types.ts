/**
 * X-Ray SDK Type Definitions
 */

// ============================================================================
// Configuration Types
// ============================================================================

export interface BaseTracerConfig {
  apiKey: string;
  projectId: string;
  enabled?: boolean; // default: true
  debug?: boolean; // default: false
  baseUrl?: string; // default: process.env.XRAY_BASE_URL || 'http://localhost:3000'
  tempDir?: string; // default: auto-detect
  maxDiskSize?: number; // default: 2 * 1024 * 1024 * 1024 (bytes) = 2GB
  maxMemorySize?: number; // default: 50 * 1024 * 1024 (bytes)
  batchInterval?: number; // default: 1000 (ms)
  maxBatchSize?: number; // default: 50
  workerPoolSize?: number; // default: 2
}

export interface TraceOptions {
  metadata?: Record<string, any>;
}

export interface StepOptions {
  stepName: string;
  stepNumber?: number;
  artifacts?: Array<{ dataId: string; type: "input" | "output" }>;
  metadata?: Record<string, any>;
}

export interface ErrorOptions {
  error: Error | string;
  metadata?: Record<string, any>;
}

export interface EndOptions {
  metadata?: Record<string, any>;
}

export interface CaptureOptions {
  stepName: string;
  artifacts: Array<{ data: any; key: string }>;
  metadata?: Record<string, any>;
}

// ============================================================================
// Event Types
// ============================================================================

export type EventType =
  | "trace-start"
  | "trace-success"
  | "trace-failure"
  | "step"
  | "step-error"
  | "trace-error"
  | "data";

export interface TraceStartEvent {
  type: "trace-start";
  traceId: string;
  projectId: string;
  metadata: Record<string, any>;
  createdAt: number;
}

export interface TraceSuccessEvent {
  type: "trace-success";
  traceId: string;
  projectId: string;
  metadata: Record<string, any>;
  successMetadata: Record<string, any>;
  status: "success";
  createdAt: number;
  endedAt: number;
}

export interface TraceFailureEvent {
  type: "trace-failure";
  traceId: string;
  projectId: string;
  metadata: Record<string, any>;
  failureMetadata: Record<string, any>;
  status: "failure";
  createdAt: number;
  endedAt: number;
}

export interface StepEvent {
  type: "step";
  stepId: string;
  traceId: string;
  projectId: string;
  stepName: string;
  stepNumber: number;
  artifacts: Array<{ dataId: string; type: "input" | "output" | null }>;
  metadata: Record<string, any>;
  timestamp: number;
}

export interface StepErrorEvent {
  type: "step-error";
  stepId: string;
  traceId: string;
  projectId: string;
  stepName: null;
  stepNumber: number;
  artifacts: [];
  metadata: Record<string, any>; // includes error and stack
  timestamp: number;
}

export interface TraceErrorEvent {
  type: "trace-error";
  stepId: string;
  traceId: string;
  projectId: string;
  stepName: null;
  stepNumber: null;
  artifacts: [];
  metadata: Record<string, any>; // includes error and stack
  timestamp: number;
}

export interface DataMetadataEvent {
  type: "data";
  dataId: string;
  traceId: string;
  key: string;
  metadata: Record<string, any>;
  dataPath: string;
}

export type Event =
  | TraceStartEvent
  | TraceSuccessEvent
  | TraceFailureEvent
  | StepEvent
  | StepErrorEvent
  | TraceErrorEvent
  | DataMetadataEvent;

// ============================================================================
// API Types (Internal)
// ============================================================================

export interface PresignRequest {
  dataId: string;
  traceId: string;
  key: string;
  metadata?: Record<string, any>;
}

export interface PresignResponse {
  presignedUrl: string;
  dataPath: string;
}

export interface IngestRequest {
  events: Event[];
}

export interface IngestResponse {
  success: boolean;
}

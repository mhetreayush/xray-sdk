/**
 * Kafka Consumer Handlers - Process event batches
 */

import { Trace } from "../models/Trace";
import { Step } from "../models/Step";
import { Data } from "../models/Data";
import { MetadataSchema } from "../models/MetadataSchema";
import { extractAndHashSchema } from "../services/schemaExtractor";

// Event type definitions (from Kafka messages)
type TraceStartEvent = {
  type: "trace-start";
  traceId: string;
  projectId: string;
  metadata: Record<string, unknown>;
  createdAt: number;
};

type TraceSuccessEvent = {
  type: "trace-success";
  traceId: string;
  projectId: string;
  metadata: Record<string, unknown>;
  successMetadata: Record<string, unknown>;
  status: "success";
  createdAt: number;
  endedAt: number;
};

type TraceFailureEvent = {
  type: "trace-failure";
  traceId: string;
  projectId: string;
  metadata: Record<string, unknown>;
  failureMetadata: Record<string, unknown>;
  status: "failure";
  createdAt: number;
  endedAt: number;
};

type StepEvent = {
  type: "step";
  stepId: string;
  traceId: string;
  projectId: string;
  stepName: string;
  stepNumber: number;
  artifacts: Array<{ dataId: string; type: "input" | "output" | null }>;
  metadata: Record<string, unknown>;
  timestamp: number;
};

type DataEvent = {
  type: "data";
  dataId: string;
  traceId: string;
  projectId: string;
  key: string;
  metadata: Record<string, unknown>;
  dataPath: string;
};

type Event =
  | TraceStartEvent
  | TraceSuccessEvent
  | TraceFailureEvent
  | StepEvent
  | DataEvent;

/**
 * Process a batch of events
 */
export async function processBatch(events: Event[]): Promise<void> {
  // Separate events by type
  const traceEvents: (
    | TraceStartEvent
    | TraceSuccessEvent
    | TraceFailureEvent
  )[] = [];
  const stepEvents: StepEvent[] = [];
  const dataEvents: DataEvent[] = [];

  for (const event of events) {
    if (
      event.type === "trace-start" ||
      event.type === "trace-success" ||
      event.type === "trace-failure"
    ) {
      traceEvents.push(event);
    } else if (event.type === "step") {
      stepEvents.push(event);
    } else if (event.type === "data") {
      dataEvents.push(event);
    }
  }

  // Process traces (upsert)
  if (traceEvents.length > 0) {
    await processTraces(traceEvents);
  }

  // Process steps (bulk insert with ordered:false)
  if (stepEvents.length > 0) {
    await processSteps(stepEvents);
  }

  // Process data (bulk insert with ordered:false)
  if (dataEvents.length > 0) {
    await processData(dataEvents);
  }

  // Update schema collection (for step events)
  if (stepEvents.length > 0) {
    await updateSchemas(stepEvents);
  }
}

/**
 * Process trace events (upsert)
 */
async function processTraces(
  events: (TraceStartEvent | TraceSuccessEvent | TraceFailureEvent)[]
): Promise<void> {
  for (const event of events) {
    if (event.type === "trace-start") {
      await Trace.updateOne(
        { traceId: event.traceId },
        {
          $set: {
            traceId: event.traceId,
            projectId: event.projectId,
            metadata: event.metadata,
            status: "pending",
            createdAt: new Date(event.createdAt),
          },
          $setOnInsert: {
            endedAt: null,
          },
        },
        { upsert: true }
      );
    } else if (event.type === "trace-success") {
      await Trace.updateOne(
        { traceId: event.traceId },
        {
          $set: {
            traceId: event.traceId,
            projectId: event.projectId,
            metadata: { ...event.metadata, ...event.successMetadata },
            successMetadata: event.successMetadata,
            status: "success",
            createdAt: new Date(event.createdAt),
            endedAt: new Date(event.endedAt),
          },
        },
        { upsert: true }
      );
    } else if (event.type === "trace-failure") {
      await Trace.updateOne(
        { traceId: event.traceId },
        {
          $set: {
            traceId: event.traceId,
            projectId: event.projectId,
            metadata: { ...event.metadata, ...event.failureMetadata },
            failureMetadata: event.failureMetadata,
            status: "failure",
            createdAt: new Date(event.createdAt),
            endedAt: new Date(event.endedAt),
          },
        },
        { upsert: true }
      );
    }
  }
}

/**
 * Process step events (bulk insert with ordered:false)
 */
async function processSteps(events: StepEvent[]): Promise<void> {
  const stepDocs = events.map((event) => ({
    stepId: event.stepId,
    traceId: event.traceId,
    projectId: event.projectId,
    type: event.type,
    stepName: event.stepName,
    stepNumber: event.stepNumber,
    artifacts: event.artifacts,
    metadata: event.metadata,
    timestamp: new Date(event.timestamp),
  }));

  try {
    await Step.insertMany(stepDocs, { ordered: false });
  } catch (error: unknown) {
    // Ignore duplicate key errors (code 11000)
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === 11000
    ) {
      // Duplicate key error, ignore
      return;
    }
    // Re-throw other errors
    throw error;
  }
}

/**
 * Process data events (bulk insert with ordered:false)
 */
async function processData(events: DataEvent[]): Promise<void> {
  const dataDocs = events.map((event) => ({
    dataId: event.dataId,
    traceId: event.traceId,
    key: event.key,
    metadata: event.metadata,
    dataPath: event.dataPath,
  }));

  try {
    await Data.insertMany(dataDocs, { ordered: false });
  } catch (error: unknown) {
    // Ignore duplicate key errors (code 11000)
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === 11000
    ) {
      // Duplicate key error, ignore
      return;
    }
    // Re-throw other errors
    throw error;
  }
}

/**
 * Update schema collection (extract and upsert schemas)
 */
async function updateSchemas(events: StepEvent[]): Promise<void> {
  for (const event of events) {
    // Only process step events with stepName
    if (event.stepName) {
      const { schemaHash, schema } = extractAndHashSchema(event.metadata);

      await MetadataSchema.updateOne(
        {
          projectId: event.projectId,
          stepName: event.stepName,
          schemaHash,
        },
        {
          $set: {
            projectId: event.projectId,
            stepName: event.stepName,
            schemaHash,
            schemaShape: schema,
            lastSeenAt: new Date(),
          },
        },
        { upsert: true }
      );
    }
  }
}

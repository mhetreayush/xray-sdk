# X-Ray System Architecture

## Overview

The X-Ray system is a distributed observability platform that collects, stores, and queries trace data from instrumented applications. The architecture is designed for high throughput, reliability, and scalability, with client-side batching and storage to ensure data durability and efficient network usage.

## Data Model Rationale

### Philosophy

- This SDK is meant to be a general purpose SDK for any application, which could have infinite use cases.
- Given that, the debugging data would mean different things for different use cases.
- Fitting every step of the workflow into categories like "filtering", "sorting", "grouping", "aggregating", "transforming", "etc." would be too restrictive, and developers would need to spend more time thinking of what category to use for each step.
- Instead, we allow the developer to capture the data as they see fit, and then query the data later using the metadata.
- Hence, metadata is the key to the system.

### Traces

#### Schema

```json
{
  traceId: string;
  projectId: string;
  metadata: Record<string, unknown>;
  status: "success" | "failure" | "pending";
  successMetadata: Record<string, unknown>;
  failureMetadata: Record<string, unknown>;
  createdAt: Date;
  endedAt: Date;
}
```

- `traceId`: Unique identifier for the trace
- `projectId`: Identifier for the project
- `metadata`: Metadata for the trace
- `status`: Status of the trace
- `successMetadata`: Metadata for the successful trace
- `failureMetadata`: Metadata for the failed trace
- `createdAt`: Timestamp when the trace was created
- `endedAt`: Timestamp when the trace was ended

#### Philosophy

- Trace can have metadata like useCase, it will make it possible to query traces by useCase.
- Traces will be scoped by projectId, and will be used to store traces for a specific project.
- status is optionally set by the user, this will determine if that run was a success or failure.
- Optionally, the user can set successMetadata and failureMetadata to store additional metadata for the trace.

### Steps

#### Schema

```json
{
  stepId: string;
  traceId: string;
  projectId: string;
  type: "step" | "step-error" | "trace-error";
  stepName: string;
  stepNumber: number;
  artifacts: Array<{ dataId: string; type: "input" | "output" | null }>;
  metadata: Record<string, unknown>;
  timestamp: Date;
}
```

- `stepId`: Unique identifier for the step
- `traceId`: Identifier for the trace
- `projectId`: Identifier for the project
- `type`: Type of the step
- `stepName`: Name of the step
- `stepNumber`: Number of the step
- `artifacts`: Artifacts for the step
- `metadata`: Metadata for the step
- `timestamp`: Timestamp when the step was created

#### Philosophy

- `projectId` is duplicated in the steps because this system is an append-only system, so we can have some degree of duplication, and duplicating the projectId in the steps will help us to query the steps by projectId without having to join the traces collection.
- `type` is used to differentiate between step, step-error, and trace-error.
- `stepName` is the name of the step, it will be used to identify the step in the UI.
- `stepNumber` is the number of the step, it will be used to identify the step in the UI.
- `artifacts` is an array of artifacts for the step, it will be used to store the artifacts for the step.
- `metadata` is the metadata for the step, it will be used to store the metadata for the step.

### Data

#### Schema

```json
{
  dataId: string;
  traceId: string;
  key: string;
  metadata: Record<string, unknown>;
  dataPath: string;
}
```

#### Philosophy

- `dataId`: Unique identifier for the data
- `traceId`: Identifier for the trace
- `key`: Key for the data
- `metadata`: Metadata for the data
- `dataPath`: Path to the data in S3

### Metadata Schema

#### Schema

```json
{
  projectId: string;
  stepName: string;
  schemaHash: string;
  schemaShape: Record<string, unknown>;
  lastSeenAt: Date;
}
```

- `projectId`: Identifier for the project
- `stepName`: Name of the step
- `schemaHash`: Hash of the schema shape
- `schemaShape`: Schema shape
- `lastSeenAt`: Timestamp when the schema was last seen

#### Philosophy

- `projectId` is duplicated in the metadata schema because this system is an append-only system, so we can have some degree of duplication, and duplicating the projectId in the metadata schema will help us to query the metadata schema by projectId without having to join the steps collection.
- `stepName` is the name of the step, it will be used to identify the step in the UI.
- `schemaHash` is the hash of the schema shape, it will be used to identify the schema shape. This is used to prevent duplicate schema shapes from being stored.
- `schemaShape` is the schema shape, it will be used to store the schema shape.

## System Components

### 1. Client SDK (`packages/xray-sdk`)

The SDK is embedded in client applications and handles:

- **Trace Collection**: Captures traces, steps, and data from instrumented code
- **Client-Side Batching**: Batches events before sending to reduce network overhead
- **Local Storage**: Persists data locally before upload to ensure durability
- **Retry Logic**: Handles failures gracefully with exponential backoff
- **Startup Recovery**: Resumes pending uploads on application restart

**Key Components:**

- `BaseTracer`: Main interface for creating traces
- `BatchQueue`: Batches events based on time interval or size
- `EventUploader`: Handles batched event uploads
- `DataUploader`: Handles data blob uploads (bypasses batching)
- `StorageAdapter`: Abstract storage interface (DiskStorage/MemoryStorage)
- `WorkerPool`: Serializes large data objects in background workers

**Why Client-Side Batching?**

- **Efficiency**: Batching reduces network overhead and API calls
- **Resilience**: Failed uploads can be retried from local storage
- **Startup Recovery**: Pending uploads resume automatically on restart
- **Durability**: Data persists locally before upload, surviving application crashes

**Why worker pool?**

- To serialize large data objects in background workers. If the object is large, it will block the main thread, and the application will become unresponsive.

### 2. Core API (`apps/core-api`)

The backend service provides:

- **Ingestion API**: Receives batched events from SDKs
- **Presigned URL Service**: Generates S3 presigned URLs for direct uploads
- **Query API**: Retrieves traces, steps, and data
- **Authentication**: API key and JWT-based authentication

**Key Components:**

- Express REST API
- Kafka Producer: Pushes events to Kafka for async processing
- Kafka Consumer: Processes events and writes to MongoDB
- S3 Service: Manages presigned URLs and blob storage
- MongoDB: Stores structured trace data

### 3. Infrastructure

- **Kafka**: Message queue for async event processing
- **MongoDB**: Document database for traces, steps, and metadata
- **S3**: Object storage for large data blobs

## Architecture Diagram

![Architecture Diagram](./docs/assets/architecture-diagram.png)

#### Real World Application

- I was building a system where the spreadsheet context would go to an LLM and it would understand the structure of the spreadsheet and the data in it, and it would be able to answer questions about the data.
- But, due to some reasons, the context was not being passed to the LLM, the LLM used to still do the job, but it was not very good.
- If I had this system, I would have seen in the trace that the input context is empty, and I would have been able to debug the system and fix the issue.

#### What Next??

- Give a way to configure where data blobs are stored and how to access them
- Stress test the system to ensure it can handle large volumes of data
- Improve the query API to support more complex queries
- Add an llm to querying system so the user can ask questions about the data
- I would gather some knowledge about components like Clickhouse, and other message queues to see if we can use them to improve the system

## Data Flow

### Event Flow (Traces, Steps)

1. **Client Side**:

   - Application calls `tracer.createTrace()` to create a new trace
   - Application calls `trace.dataId(data, key, metadata)` to store data
   - Application calls `trace.step(stepName, metadata)` to store a step
   - Application calls `trace.success(metadata)` to end the trace with success
   - Application calls `trace.failure(metadata)` to end the trace with failure
   - Events are added to `BatchQueue`
   - When batch interval (default: 5s) or max batch size (default: 100) is reached:
     - Batch is serialized to JSON
     - Written to local storage (disk or memory)
     - Sent to `/api/v1/ingest` endpoint
     - On success, local file is deleted
     - On failure, events are re-queued for retry

2. **Server Side**:

   - Ingest API validates API key and extracts `projectId`
   - `projectId` is added to events (enforced server-side)
   - Events are pushed to Kafka topic `xray-events`
   - API returns success immediately (async processing)

3. **Kafka Consumer**:
   - Consumer pulls batches from Kafka (up to 1000 messages)
   - Events are separated by type (traces, steps, data)
   - Traces are upserted to MongoDB
   - Steps and data metadata are bulk inserted
   - Schema extraction runs on step events
   - Processed with 100-200ms delay between batches

### Data Flow (Large Blobs)

1. **Client Side**:

   - Application calls `trace.dataId(data, key, metadata)`
   - Data is immediately queued for upload (no batching)
   - Serialized using WorkerPool (background thread)
   - Written to local storage
   - Requests presigned URL from `/api/v1/presign`
   - Uploads directly to S3 using presigned URL
   - On success, local file is deleted
   - On failure, retries with exponential backoff (max 5 attempts)

2. **Server Side**:

   - Presign API validates API key
   - Generates S3 presigned PUT URL (60 min expiry)
   - Queues data metadata event to Kafka
   - Returns presigned URL to client

3. **S3 Upload**:

   - Client uploads data directly to S3 (bypasses API server)
   - For files >5MB, uses multipart upload
   - Single PUT request for smaller files

4. **Kafka Consumer**:
   - Processes data metadata events
   - Inserts data records into MongoDB with S3 path reference

## Key Design Decisions

### Client-Side Storage and Batching

**Why?**

- **Durability**: Data persists locally before upload, surviving application crashes
- **Efficiency**: Batching reduces network overhead and API calls
- **Resilience**: Failed uploads can be retried from local storage
- **Startup Recovery**: Pending uploads resume automatically on restart
- **Store To Disk** If the intermediate data is large, and if we hold a reference to it until it is uploaded, it will not get garbage collected, and will stay in memory. Also, the developer using this SDK will expect the data to be deleted after their client's request is completed. Hence, we store the data to disk.

**Implementation:**

- `DiskStorage`: Writes to filesystem with FIFO cleanup when size limit exceeded
- `MemoryStorage`: In-memory storage for environments without filesystem access
- `BatchQueue`: Time-based (5s) or size-based (100 events) flushing
- Automatic cleanup when storage exceeds max size (default: 100MB)

### Async Processing with Kafka

**Why?**

- **Scalability**: Decouples ingestion from processing
- **Reliability**: Kafka provides durability and replay capability
- **Performance**: API responds immediately, processing happens asynchronously
- **Throughput**: Batch processing reduces database write overhead, and prevents database overload

**Implementation:**

- Producer pushes events to Kafka immediately
- Consumer processes in batches (1000 messages)
- Delay between batches prevents database overload
- Manual offset resolution ensures at-least-once processing

### Direct S3 Uploads

**Why?**

- **Performance**: Bypasses API server for large data transfers
- **Scalability**: Reduces API server load
- **Cost**: Direct uploads are more efficient than proxying through API

**Implementation:**

- Presigned URLs with 60-minute expiry
- Multipart upload for files >5MB
- Client handles retries and chunking

## Storage Architecture

### Client Storage

- **Location**: `{tempDir}/xray-sdk/{data|events}/`
- **Format**:
  - Events: `{batchId}.events.json`
  - Data: `{dataId}.data.bin`
- **Cleanup**: FIFO deletion when storage exceeds max size
- **Recovery**: Scans directory on startup to resume pending uploads

### Server Storage

- **MongoDB**: Structured data (traces, steps, metadata)
- **S3**: Large data blobs
- **Path Structure**: `{projectId}/{dataId}`

## Authentication & Authorization

- **API Keys**: Used for SDK authentication (stored in `apiKeys` collection)
- **JWT Tokens**: Used for frontend/user authentication
- **Project Isolation**: All data is scoped by `projectId` (enforced server-side)

## Scalability Considerations

1. **Horizontal Scaling**:

   - Multiple API server instances (stateless)
   - Multiple Kafka consumers (consumer groups)
   - MongoDB replica sets

2. **Partitioning**:

   - Kafka topic with 3 partitions for parallel processing
   - MongoDB sharding by `projectId` (future)

## Error Handling

### Client Side

- All operations wrapped in try-catch
- Never throws errors that break user's application
- Silent failures (unless debug mode enabled)
- Exponential backoff retries (max 5 attempts)
- Failed uploads persist in local storage

### Debugging

- **Debug Mode**: SDK logs all operations when enabled

### Endpoints, Request and Response

#### POST /api/v1/auth/register

**Purpose:** Register a new user account

**Authentication:** None required

**Request Body:**

```json
{
  "email": "string (email format)",
  "password": "string",
  "name": "string"
}
```

**Response:** 200 OK

```json
{
  "user": {
    "id": "6963d488208b19fda2c2d21d",
    "email": "test@example.com",
    "name": "Test User"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OTYzZDQ4ODIwOGIxOWZkYTJjMmQyMWQiLCJpYXQiOjE3NjgxNTAxNTMsImV4cCI6MTc2ODc1NDk1M30.QfXNaSgNOV9bj_rbZ1VDnEnVeLROyE8COamm4UXhKsE"
}
```

---

#### POST /api/v1/projects

**Purpose:** Create a new project

**Authentication:** JWT Bearer token (Authorization header)

**Request Body:**

```json
{
  "name": "string"
}
```

**Response:** 200 OK

```json
{
  "project": {
    "projectId": "611f8714-c116-4828-8bd7-03162cd4d4ce",
    "name": "My Project final",
    "_id": "6963d5dd208b19fda2c2d269",
    "createdAt": "2026-01-11T16:54:53.243Z",
    "updatedAt": "2026-01-11T16:54:53.243Z",
    "__v": 0
  }
}
```

---

#### POST /api/v1/projects/{projectId}/keys

**Purpose:** Create an API key for a project

**Authentication:** JWT Bearer token (Authorization header)

**Path Parameters:**

- `projectId` (string, required): The ID of the project

**Request Body:**

```json
{
  "name": "Example App Key"
}
```

**Response:** 200 OK

```json
{
  "apiKey": {
    "id": "6963d488208b19fda2c2d21d",
    "key": "xray_sk_1234567890",
    "name": "Example App Key"
  }
}
```

---

#### GET /api/v1/projects/{projectId}/schemas

**Purpose:** Get metadata schema for a project

**Authentication:** JWT Bearer token (Authorization header)

**Path Parameters:**

- `projectId` (string, required): The ID of the project

**Response:** 200 OK

```json
{
  "schema": {
    "keywordCount": "number",
    "candidateCount": "number",
    "filterConfig": {
      "priceRange": {
        "min": "number",
        "max": "number"
      },
      "minRating": "number",
      "minReviews": "number",
      "categoryMatch": "string"
    },
    "inputCount": "number",
    "outputCount": "number",
    "filteredCount": "number",
    "filteredPercentage": "string",
    "rankedCount": "number",
    "selectedId": "string",
    "selectedTitle": "string"
  }
}
```

---

#### POST /api/v1/projects/{projectId}/query

**Purpose:** Query steps with filters

**Authentication:** JWT Bearer token (Authorization header)

**Path Parameters:**

- `projectId` (string, required): The ID of the project

**Request Body:**

```json
{
  "filter": {
    "metadata.keywordCount": {
      "$gt": "integer"
    }
  }
}
```

**Request:**

```json
{
  "results": [
    {
      "_id": "6963d5fa208b19fda2c2d292",
      "stepId": "6b457392-8dee-4cee-a12a-e1f0dee1929b",
      "traceId": "611f8714-c116-4828-8bd7-03162cd4d4ce-2dfbfe0e-d7f1-4f9d-a6ae-b0d82ecc3f18",
      "projectId": "611f8714-c116-4828-8bd7-03162cd4d4ce",
      "type": "step",
      "stepName": "generate_keywords",
      "stepNumber": 1,
      "artifacts": [
        {
          "dataId": "522a2253-0a45-41c0-b256-a944834047a5",
          "type": "input",
          "_id": "6963d5fa208b19fda2c2d293"
        },
        {
          "dataId": "eb8778d8-9609-4bec-b845-8c44f18fe2ce",
          "type": "output",
          "_id": "6963d5fa208b19fda2c2d294"
        }
      ],
      "metadata": {
        "keywordCount": 5
      },
      "timestamp": "2026-01-11T16:55:21.013Z",
      "__v": 0
    }
  ],
  "nextCursor": null
}
```

**Note:** The filter supports nested metadata paths (e.g., `metadata.testObject.testNestedObject.name`) and MongoDB-style operators (e.g., `$gt`, `$lt`, `$eq`).

**Response:** 200 OK

- Query results matching the specified filters

---

#### POST /api/v1/ingest

**Purpose:** Receive batch of events from SDK and push to Kafka for async processing

**Authentication:** API Key (x-api-key header)

**Request Body:**

```json
{
  "events": [
    {
      "type": "trace-start" | "trace-success" | "trace-failure" | "step" | "step-error" | "trace-error" | "data",
      // ... event-specific fields
    }
  ]
}
```

**Event Types:**

- `trace-start`: Trace creation event
- `trace-success`: Trace completion with success status
- `trace-failure`: Trace completion with failure status
- `step`: Step execution event
- `step-error`: Step error event
- `trace-error`: Trace error event
- `data`: Data metadata event

**Example Request:**

```json
{
  "events": [
    {
      "type": "trace-start",
      "traceId": "trace-123",
      "metadata": { "key": "value" },
      "createdAt": 1234567890
    },
    {
      "type": "step",
      "stepId": "step-456",
      "traceId": "trace-123",
      "stepName": "process-data",
      "stepNumber": 1,
      "metadata": { "processed": true },
      "timestamp": 1234567891
    }
  ]
}
```

**Response:** 200 OK

```json
{
  "success": true
}
```

**Note:**

- Events are pushed to Kafka topic (`xray-events`) asynchronously
- The API returns immediately without waiting for consumer processing
- `projectId` is automatically added to all events server-side (extracted from API key)
- Events are processed by Kafka consumer and written to MongoDB

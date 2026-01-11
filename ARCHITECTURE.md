# X-Ray System Architecture

## Overview

The X-Ray system is a distributed observability platform that collects, stores, and queries trace data from instrumented applications. The architecture is designed for high throughput, reliability, and scalability, with client-side batching and storage to ensure data durability and efficient network usage.

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

## Monitoring & Observability

- **Debug Mode**: SDK logs all operations when enabled

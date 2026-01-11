# PRD: X-Ray SDK

## Overview

A TypeScript SDK for Node.js that captures debugging data from multi-step pipelines. Designed to never impact user's application performance or reliability.

## Package Info

- **Location**: `packages/sdk`
- **Package name**: `@xray/sdk`
- **Language**: TypeScript
- **Target**: Node.js

---

## Public API

### Configuration

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| apiKey | string | yes | - | API key for authentication |
| projectId | string | yes | - | Project identifier |
| enabled | boolean | no | true | When false, all methods become no-ops |
| debug | boolean | no | false | When true, log internal operations to console |
| baseUrl | string | no | env or localhost:3000 | Backend API URL |
| tempDir | string | no | auto-detect | Directory for temporary file storage |
| maxDiskSize | number | no | 500MB | Maximum disk space for temp files |
| maxMemorySize | number | no | 50MB | Maximum memory for fallback storage |
| batchInterval | number | no | 1000ms | Interval for batch uploads |
| maxBatchSize | number | no | 50 | Max events per batch |
| workerPoolSize | number | no | 2 | Number of serialization workers |

### BaseTracer

- Constructor accepts configuration object
- `createTrace(options)` - Creates a new trace instance with optional metadata
- Singleton pattern recommended (initialize once, export instance)

### Trace Instance

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| dataId | (data: any, key: string, metadata?: object) | string | Stores data blob, returns ID immediately |
| step | (options: StepOptions) | void | Records a step |
| error | (options: ErrorOptions) | void | Records an error (does not end trace) |
| success | (options?: EndOptions) | void | Ends trace with success status |
| failure | (options?: EndOptions) | void | Ends trace with failure status |
| capture | (options: CaptureOptions) | void | Minimal mode - step with inline data |
| traceId | - | string | Property to access the trace ID |

### StepOptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| stepName | string | yes | Name of the step |
| stepNumber | number | no | Auto-increments if not provided |
| artifacts | array | no | Array of { dataId, type: 'input' \| 'output' } |
| metadata | object | no | Arbitrary metadata |

### CaptureOptions (Minimal Mode)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| stepName | string | yes | Name of the step |
| artifacts | array | yes | Array of { data, key } - actual data, not references |
| metadata | object | no | Arbitrary metadata |

In minimal mode, artifact type is null (no input/output distinction).

---

## Internal Behavior

### ID Generation

- All IDs generated locally using UUID v4
- traceId format: `{projectId}-{uuid}`
- stepId format: `{uuid}`
- dataId format: `{uuid}`
- No network calls required to generate IDs

### Storage Adapter

Two implementations with same interface:

**DiskStorage (primary)**
- Writes to tempDir
- Tracks current size in memory (O(1) check)
- On startup, scans directory to initialize size
- FIFO deletion when maxDiskSize exceeded

**MemoryStorage (fallback)**
- In-memory Map storage
- Used when tempDir is unwritable
- Logs warning when falling back
- FIFO deletion when maxMemorySize exceeded

**tempDir auto-detection:**
- Default: os.tmpdir()/xray
- If tmpfs detected AND system memory < 512MB: use ~/.xray/buffer instead
- Avoids RAM-backed temp directories on low-memory systems

### Worker Pool

- Pool of worker threads for JSON serialization
- Prevents main event loop blocking on large objects
- Workers stay alive and are reused
- Queue tasks if all workers busy
- Default pool size: 2 workers (~5MB RAM each)

### Batch Queue

Events (steps, traces, errors) go through batching:

- Collects events in queue
- Flushes when: batchInterval reached OR maxBatchSize reached (whichever first)
- Interval starts on first event added
- Interval stops after 10 seconds of empty queue
- Failed batches are re-queued for retry

### Data Upload (Bypasses Batching)

Data blobs upload immediately, not through batch queue:

1. Serialize data using worker pool
2. Write serialized data to local storage
3. Request presigned URL from backend
4. Upload to S3 using presigned URL
5. Delete local file on success
6. Retry with exponential backoff on failure (max 5 attempts, capped at 10 second delay)

### Event Upload

Steps, traces, errors go through batch queue:

1. Event added to batch queue
2. On flush trigger, write batch to local storage
3. Send batch to ingestion endpoint
4. Delete local file on success
5. Retry with exponential backoff on failure

### Startup Recovery

On SDK initialization:
- Scan tempDir for pending files
- Resume uploads for any files found
- Process in background, don't block initialization

### Error Handling

- All operations wrapped in try-catch
- Never throw errors that would break user's application
- On failure: log if debug mode, otherwise silent
- Failed uploads stay on disk until FIFO deleted

---

## API Endpoints Called

### Presigned URL

- Endpoint: POST {baseUrl}/api/v1/presign
- Headers: x-api-key
- Body: dataId, traceId, key, metadata
- Response: presignedUrl, dataPath

### S3 Upload

- Method: PUT to presignedUrl
- Headers: Content-Type application/json
- Body: serialized data buffer

### Ingest Events

- Endpoint: POST {baseUrl}/api/v1/ingest
- Headers: x-api-key
- Body: events array
- Response: success boolean

---

## Event Types

### trace-start
Sent when createTrace() is called.
Fields: type, traceId, projectId, metadata, createdAt

### trace-success
Sent when success() is called.
Fields: type, traceId, projectId, metadata, successMetadata, status, createdAt, endedAt

### trace-failure
Sent when failure() is called.
Fields: type, traceId, projectId, metadata, failureMetadata, status, createdAt, endedAt

### step
Sent when step() is called.
Fields: type, stepId, traceId, projectId, stepName, stepNumber, artifacts, metadata, timestamp

### step-error
Sent when error() is called on a trace.
Fields: type, stepId, traceId, projectId, stepName (null), stepNumber (null), artifacts (empty), metadata (includes error and stack), timestamp

### trace-error
Same structure as step-error but type is 'trace-error'.

### data
Metadata sent to presigned URL service.
Fields: type, dataId, traceId, key, metadata, dataPath

---

## File Structure

```
packages/sdk/
├── src/
│   ├── index.ts
│   ├── BaseTracer.ts
│   ├── Trace.ts
│   ├── types.ts
│   ├── storage/
│   │   ├── StorageAdapter.ts (interface)
│   │   ├── DiskStorage.ts
│   │   └── MemoryStorage.ts
│   ├── workers/
│   │   ├── WorkerPool.ts
│   │   └── serialize-worker.ts
│   ├── uploaders/
│   │   ├── DataUploader.ts
│   │   └── EventUploader.ts
│   ├── BatchQueue.ts
│   └── api.ts
├── package.json
├── tsconfig.json
└── README.md
```

---

## Dependencies

- uuid: ID generation
- worker_threads: built-in Node.js module

---

## Acceptance Criteria

1. BaseTracer initializes with config, creates storage adapter and worker pool
2. createTrace returns Trace instance with unique traceId
3. dataId serializes in worker, writes to storage, uploads to S3 in background, returns ID immediately (fire and forget)
4. step adds event to batch queue with auto-incrementing stepNumber
5. error adds error event to batch queue
6. success/failure adds end event to batch queue with respective status
7. capture calls dataId for each artifact internally, then calls step with type:null artifacts
8. Batch queue flushes on interval or size threshold (whichever first)
9. Failed uploads retry with exponential backoff (capped at 10 seconds)
10. FIFO deletion when storage limit exceeded
11. Startup recovery resumes pending uploads from disk
12. enabled:false makes all methods no-ops
13. debug:true logs internal operations to console
14. SDK never throws errors that break user's application
15. Falls back to memory storage if disk unwritable (with warning)

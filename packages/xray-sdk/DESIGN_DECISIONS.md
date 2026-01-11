# SDK Design Decisions

## Open Questions - Resolved

1. **Package Name**: `@xray/sdk` (scoped package, matches PRD)
2. **Event Metadata**: Yes - `trace-start` includes `metadata` from `createTrace()`
3. **Step Number**: Auto-increment starts at **1** (not 0)
4. **Worker Cleanup**: Yes - gracefully shutdown workers on process exit
5. **Storage File Format**: **Raw buffers** (not JSON strings)
   - Compute content type from data structure
   - Write as Buffer to disk
   - Users can download and inspect files
6. **Batch ID**: **UUID** (for uniqueness and collision avoidance)

## Key Design Decisions

### Storage Format

- Write raw buffers to disk (not JSON strings)
- Store metadata about content type for proper handling
- File naming: `data-{timestamp}-{dataId}.bin` or `.json` based on content type detection
- Event batches: `events-{timestamp}-{batchId}.json` (these are JSON by nature)

### Worker Cleanup

- Implement graceful shutdown
- Close worker pool on process exit signals (SIGINT, SIGTERM)
- Drain pending tasks or allow them to complete
- Clean shutdown prevents zombie workers

### Step Numbering

- Start at 1 (first step is step 1, not step 0)
- Auto-increment: `currentStepNumber` starts at 0, first step becomes 1
- If user provides `stepNumber`, use it and update counter to max(existing, provided)

### Content Type Detection

- For data blobs: determine if it's JSON-serializable
- Store as Buffer with appropriate file extension
- Metadata includes content type hint
- S3 upload uses appropriate Content-Type header

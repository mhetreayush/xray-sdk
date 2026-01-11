# PRD: Core API

## Overview

Backend API service that handles SDK ingestion, data querying, authentication, and project management.

## App Info

- **Location**: `apps/core-api`
- **Language**: TypeScript
- **Framework**: Express or Fastify
- **Database**: MongoDB
- **Queue**: Kafka
- **Storage**: S3

---

## Services

### 1. Presigned URL Service

**Responsibility:** Issue S3 presigned URLs for data upload, queue data metadata to Kafka.

**Endpoint:** POST /api/v1/presign

**Auth:** API Key (x-api-key header)

**Request Body:**
| Field | Type | Required |
|-------|------|----------|
| dataId | string | yes |
| traceId | string | yes |
| key | string | yes |
| metadata | object | no |

**Response:**
| Field | Type |
|-------|------|
| presignedUrl | string |
| dataPath | string |

**Behavior:**
1. Validate API key, extract projectId
2. Generate S3 path: `data/{dataId}`
3. Generate presigned PUT URL (expiry: 15 minutes)
4. Push data metadata event to Kafka (type: 'data')
5. Return presignedUrl and dataPath

---

### 2. Ingestion API

**Responsibility:** Receive event batches from SDK, push to Kafka.

**Endpoint:** POST /api/v1/ingest

**Auth:** API Key (x-api-key header)

**Request Body:**
| Field | Type | Required |
|-------|------|----------|
| events | array | yes |

Events array contains objects with type: 'trace-start' | 'trace-success' | 'trace-failure' | 'step' | 'step-error' | 'trace-error'

**Response:**
| Field | Type |
|-------|------|
| success | boolean |

**Behavior:**
1. Validate API key, extract projectId
2. Validate events array is not empty
3. Push all events to Kafka topic (xray-events)
4. Return success immediately (don't wait for consumer)

---

### 3. Kafka Consumer

**Responsibility:** Pull events from Kafka, write to MongoDB, update schema collection.

**Kafka Config:**
- Topic: xray-events
- Consumer Group: xray-consumers
- Batch Size: 1000 messages
- Delay between batches: 100-200ms

**Behavior:**

For each batch:

1. Separate events by type:
   - Traces: trace-start, trace-success, trace-failure
   - Steps: step, step-error, trace-error
   - Data: data

2. **Process Traces:**
   - Upsert to traces collection (match on traceId)
   - Upsert allows trace-start and trace-success/failure to arrive in any order

3. **Process Steps:**
   - Bulk insert to steps collection with ordered:false
   - Catch duplicate key errors (code 11000), ignore them

4. **Process Data:**
   - Bulk insert to data collection with ordered:false
   - Catch duplicate key errors, ignore them

5. **Update Schema Collection:**
   - For each step event, extract metadata schema shape
   - Schema shape: map each key to its type (string, number, boolean, object, array)
   - Hash the schema shape
   - Upsert to schemas collection (match on projectId + stepName + schemaHash)
   - Update lastSeenAt timestamp

6. Commit Kafka offset after successful processing

**Schema Extraction Example:**
```
Input metadata: { priceMax: 100, minRating: 4.5, tags: ["a", "b"] }
Schema shape: { priceMax: "number", minRating: "number", tags: "array" }
Hash: md5 or sha256 of sorted JSON string of schema shape
```

---

### 4. Query API

**Responsibility:** Serve frontend queries for traces, steps, data.

**Auth:** JWT (Authorization: Bearer header) + Project membership check

---

#### GET /api/v1/projects/:projectId/traces

**Purpose:** List traces for a project with filters and pagination.

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| status | string | no | Filter by 'success' \| 'failure' \| 'pending' |
| startDate | ISO string | no | Filter createdAt >= startDate |
| endDate | ISO string | no | Filter createdAt <= endDate |
| limit | number | no | Default 50, max 100 |
| cursor | string | no | Cursor for pagination (traceId of last item) |

**Response:**
| Field | Type |
|-------|------|
| traces | array |
| nextCursor | string or null |

**Behavior:**
1. Validate JWT, extract userId
2. Check user is member of projectId
3. Build MongoDB query with filters
4. Sort by createdAt descending
5. Use cursor-based pagination
6. Return traces and nextCursor

---

#### GET /api/v1/traces/:traceId

**Purpose:** Get single trace with all its steps.

**Response:**
| Field | Type |
|-------|------|
| trace | object |
| steps | array |

**Behavior:**
1. Validate JWT, extract userId
2. Fetch trace by traceId
3. Check user is member of trace's projectId
4. Fetch all steps for traceId, sorted by stepNumber
5. Return trace and steps

---

#### GET /api/v1/traces/:traceId/data/:dataId

**Purpose:** Get presigned URL to download data blob.

**Response:**
| Field | Type |
|-------|------|
| presignedUrl | string |
| key | string |
| metadata | object |

**Behavior:**
1. Validate JWT, extract userId
2. Fetch data document by dataId
3. Verify data.traceId matches :traceId
4. Fetch trace, check user is member of projectId
5. Generate presigned GET URL (expiry: 15 minutes)
6. Return presignedUrl, key, metadata

---

#### POST /api/v1/projects/:projectId/query

**Purpose:** Query steps with MongoDB-style filters.

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| filter | object | yes | MongoDB query filter |
| sort | object | no | Sort specification, default { timestamp: -1 } |
| limit | number | no | Default 50, max 100 |
| cursor | string | no | Cursor for pagination |

**Filter Examples:**
```
// Steps where outputCount < 10% of inputCount
{
  "metadata.outputCount": { "$lt": 100 },
  "stepName": "filter"
}

// Steps with specific metadata field
{
  "metadata.model": "gpt-4"
}

// Using $expr for computed comparisons
{
  "$expr": {
    "$lt": ["$metadata.outputCount", { "$multiply": ["$metadata.inputCount", 0.1] }]
  }
}
```

**Response:**
| Field | Type |
|-------|------|
| results | array |
| nextCursor | string or null |

**Behavior:**
1. Validate JWT, extract userId
2. Check user is member of projectId
3. Inject projectId into filter (always scope to project)
4. Sanitize filter (prevent injection, limit operators)
5. Execute query on steps collection
6. Return results and nextCursor

**Allowed MongoDB Operators:**
- Comparison: $eq, $ne, $gt, $gte, $lt, $lte, $in, $nin
- Logical: $and, $or, $not
- Element: $exists
- Evaluation: $expr, $regex

**Disallowed:**
- $where (code execution)
- $function (code execution)
- Any update operators

---

#### GET /api/v1/projects/:projectId/schemas

**Purpose:** Get metadata schemas for autocomplete.

**Query Parameters:**
| Param | Type | Required |
|-------|------|----------|
| stepName | string | no |

**Response:**
| Field | Type |
|-------|------|
| schemas | array |

Each schema object:
| Field | Type |
|-------|------|
| stepName | string |
| schema | object |
| lastSeenAt | timestamp |

**Behavior:**
1. Validate JWT, check project membership
2. Query schemas collection by projectId
3. Optionally filter by stepName
4. Return all schema variations

---

### 5. Auth Service

#### POST /api/v1/auth/register

**Request Body:**
| Field | Type | Required |
|-------|------|----------|
| email | string | yes |
| password | string | yes |
| name | string | yes |

**Response:**
| Field | Type |
|-------|------|
| user | object (id, email, name) |
| token | string (JWT) |

**Behavior:**
1. Validate email format, password strength
2. Check email not already registered
3. Hash password
4. Create user document
5. Generate JWT
6. Return user and token

---

#### POST /api/v1/auth/login

**Request Body:**
| Field | Type | Required |
|-------|------|----------|
| email | string | yes |
| password | string | yes |

**Response:**
| Field | Type |
|-------|------|
| user | object |
| token | string |

**Behavior:**
1. Find user by email
2. Verify password
3. Generate JWT
4. Return user and token

---

### 6. Project Management

#### GET /api/v1/projects

**Auth:** JWT

**Response:**
| Field | Type |
|-------|------|
| projects | array |

**Behavior:**
1. Find all projectMembers for userId
2. Fetch projects by IDs
3. Return projects

---

#### POST /api/v1/projects

**Auth:** JWT

**Request Body:**
| Field | Type | Required |
|-------|------|----------|
| name | string | yes |

**Response:**
| Field | Type |
|-------|------|
| project | object |

**Behavior:**
1. Create project document
2. Create projectMember (userId, projectId)
3. Return project

---

#### POST /api/v1/projects/:projectId/keys

**Auth:** JWT + Project membership

**Request Body:**
| Field | Type | Required |
|-------|------|----------|
| name | string | yes |

**Response:**
| Field | Type |
|-------|------|
| apiKey | object (id, key, name) |

**Behavior:**
1. Generate API key: `xray_sk_{random32chars}`
2. Create apiKey document
3. Return apiKey (this is the only time full key is shown)

---

#### GET /api/v1/projects/:projectId/keys

**Auth:** JWT + Project membership

**Response:**
| Field | Type |
|-------|------|
| apiKeys | array |

Each key shows: id, name, createdAt, lastUsedAt (NOT the actual key)

---

#### DELETE /api/v1/projects/:projectId/keys/:keyId

**Auth:** JWT + Project membership

**Behavior:**
1. Set apiKey.isActive = false (soft delete)
2. Return success

---

#### POST /api/v1/projects/:projectId/members

**Auth:** JWT + Project membership

**Request Body:**
| Field | Type | Required |
|-------|------|----------|
| email | string | yes |

**Response:**
| Field | Type |
|-------|------|
| member | object |

**Behavior:**
1. Find user by email
2. Check not already a member
3. Create projectMember document
4. Return member

---

## Middleware

### API Key Auth Middleware

For SDK endpoints (/presign, /ingest):
1. Extract x-api-key header
2. Find apiKey document where key matches and isActive = true
3. Update lastUsedAt
4. Attach projectId to request
5. Reject if not found

### JWT Auth Middleware

For frontend endpoints:
1. Extract Authorization Bearer token
2. Verify JWT signature
3. Extract userId from payload
4. Attach userId to request
5. Reject if invalid

### Project Membership Middleware

For project-scoped endpoints:
1. Extract projectId from params
2. Check projectMembers for userId + projectId
3. Reject if not member

---

## MongoDB Collections

### users
| Field | Type | Index |
|-------|------|-------|
| _id | ObjectId | primary |
| email | string | unique |
| name | string | - |
| passwordHash | string | - |
| createdAt | Date | - |
| updatedAt | Date | - |

### projects
| Field | Type | Index |
|-------|------|-------|
| _id | ObjectId | primary |
| name | string | - |
| createdAt | Date | - |
| updatedAt | Date | - |

### projectMembers
| Field | Type | Index |
|-------|------|-------|
| _id | ObjectId | primary |
| projectId | ObjectId | compound with userId (unique) |
| userId | ObjectId | yes |
| joinedAt | Date | - |

### apiKeys
| Field | Type | Index |
|-------|------|-------|
| _id | ObjectId | primary |
| key | string | unique |
| projectId | ObjectId | yes |
| name | string | - |
| isActive | boolean | - |
| createdAt | Date | - |
| lastUsedAt | Date | - |

### traces
| Field | Type | Index |
|-------|------|-------|
| traceId | string | unique |
| projectId | ObjectId | compound with createdAt |
| metadata | object | - |
| status | string | - |
| successMetadata | object | - |
| failureMetadata | object | - |
| createdAt | Date | - |
| endedAt | Date | - |

### steps
| Field | Type | Index |
|-------|------|-------|
| stepId | string | unique |
| traceId | string | yes |
| projectId | ObjectId | - |
| type | string | - |
| stepName | string | - |
| stepNumber | number | - |
| artifacts | array | - |
| metadata | object | - |
| timestamp | Date | - |

### data
| Field | Type | Index |
|-------|------|-------|
| dataId | string | unique |
| traceId | string | yes |
| key | string | - |
| metadata | object | - |
| dataPath | string | - |

### schemas
| Field | Type | Index |
|-------|------|-------|
| _id | ObjectId | primary |
| projectId | ObjectId | compound with stepName, schemaHash (unique) |
| stepName | string | - |
| schemaHash | string | - |
| schema | object | - |
| lastSeenAt | Date | - |

---

## File Structure

```
apps/core-api/
├── src/
│   ├── index.ts
│   ├── app.ts
│   ├── config.ts
│   ├── routes/
│   │   ├── auth.ts
│   │   ├── projects.ts
│   │   ├── ingest.ts
│   │   ├── presign.ts
│   │   └── query.ts
│   ├── middleware/
│   │   ├── apiKeyAuth.ts
│   │   ├── jwtAuth.ts
│   │   └── projectMembership.ts
│   ├── services/
│   │   ├── kafka.ts
│   │   ├── s3.ts
│   │   └── schemaExtractor.ts
│   ├── consumer/
│   │   ├── index.ts
│   │   └── handlers.ts
│   ├── models/
│   │   ├── User.ts
│   │   ├── Project.ts
│   │   ├── ProjectMember.ts
│   │   ├── ApiKey.ts
│   │   ├── Trace.ts
│   │   ├── Step.ts
│   │   ├── Data.ts
│   │   └── Schema.ts
│   └── utils/
│       ├── jwt.ts
│       ├── hash.ts
│       └── queryValidator.ts
├── package.json
├── tsconfig.json
└── Dockerfile
```

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| PORT | Server port |
| MONGODB_URI | MongoDB connection string |
| KAFKA_BROKERS | Kafka broker addresses |
| KAFKA_TOPIC | Kafka topic name |
| AWS_REGION | S3 region |
| AWS_ACCESS_KEY_ID | S3 access key |
| AWS_SECRET_ACCESS_KEY | S3 secret key |
| S3_BUCKET | S3 bucket name |
| JWT_SECRET | Secret for JWT signing |
| JWT_EXPIRY | JWT expiry time (e.g., "7d") |

---

## Acceptance Criteria

### Presign
1. Validates API key
2. Generates presigned PUT URL
3. Pushes data metadata to Kafka
4. Returns presignedUrl and dataPath

### Ingest
1. Validates API key
2. Accepts batch of events
3. Pushes all events to Kafka
4. Returns success immediately

### Consumer
1. Pulls batches from Kafka
2. Upserts traces
3. Bulk inserts steps and data
4. Ignores duplicate key errors
5. Extracts and upserts metadata schemas
6. Commits offset after processing

### Query
1. Validates JWT and project membership
2. Lists traces with filters and pagination
3. Gets single trace with all steps
4. Issues presigned GET URLs for data download
5. Executes MongoDB-style queries on steps
6. Sanitizes queries to prevent injection
7. Returns schemas for autocomplete

### Auth
1. Registers users with hashed passwords
2. Logs in users and returns JWT
3. JWT contains userId and expiry

### Projects
1. Creates projects and adds creator as member
2. Lists user's projects
3. Generates API keys
4. Lists API keys (without showing full key)
5. Deactivates API keys
6. Adds members by email

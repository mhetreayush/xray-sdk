# Core API

Backend API service for X-Ray SDK ingestion, data querying, authentication, and project management.

## Prerequisites

- Node.js 20+
- pnpm 8+
- Docker & Docker Compose (for local development)
- AWS Account with S3 bucket (for data storage)
- MongoDB (via Docker Compose)
- Kafka (via Docker Compose)

## Local Development Setup

### 1. Start Infrastructure Services

From the project root, start MongoDB and Kafka:

```bash
docker-compose up -d
```

This will start:

- MongoDB on port 27017
- Kafka on port 9092
- Zookeeper (required for Kafka)

### 2. Create Kafka Topic

After Kafka is running, create the required topic:

```bash
docker exec xray-kafka kafka-topics --create \
  --topic xray-events \
  --bootstrap-server localhost:9092 \
  --partitions 3 \
  --replication-factor 1
```

### 3. Configure Environment Variables

Copy the example environment file and update it:

```bash
cp .env.example .env
```

Update `.env` with your values:

- `AWS_REGION`: Your AWS region
- `AWS_ACCESS_KEY_ID`: Your AWS access key
- `AWS_SECRET_ACCESS_KEY`: Your AWS secret key
- `S3_BUCKET`: Your S3 bucket name (must exist)
- `JWT_SECRET`: A secure random string for JWT signing

### 4. Install Dependencies

From the project root:

```bash
pnpm install
```

### 5. Build

```bash
cd apps/core-api
pnpm build
```

### 6. Run

Development mode (with hot reload):

```bash
pnpm dev
```

Production mode:

```bash
pnpm start
```

The API will be available at `http://localhost:3000`

## API Endpoints

### Health Check

- `GET /health` - Health check endpoint

### Authentication

- `POST /api/v1/auth/register` - Register a new user
- `POST /api/v1/auth/login` - Login and get JWT token

### Projects

- `GET /api/v1/projects` - List user's projects
- `POST /api/v1/projects` - Create a new project
- `POST /api/v1/projects/:projectId/keys` - Create API key
- `GET /api/v1/projects/:projectId/keys` - List API keys
- `DELETE /api/v1/projects/:projectId/keys/:keyId` - Delete API key
- `POST /api/v1/projects/:projectId/members` - Add project member

### SDK Endpoints (API Key Auth)

- `POST /api/v1/presign` - Get presigned S3 URL for data upload
- `POST /api/v1/ingest` - Ingest event batches

### Query Endpoints (JWT Auth)

- `GET /api/v1/projects/:projectId/traces` - List traces
- `GET /api/v1/traces/:traceId` - Get trace with steps
- `GET /api/v1/traces/:traceId/data/:dataId` - Get presigned URL for data download
- `POST /api/v1/projects/:projectId/query` - Query steps with filters
- `GET /api/v1/projects/:projectId/schemas` - Get metadata schemas

## Testing with Example App

1. Register a user and create a project via API
2. Create an API key for the project
3. Use the API key in the example-app SDK configuration
4. Run the example-app to send events

## Stopping Services

```bash
docker-compose down
```

To also remove volumes:

```bash
docker-compose down -v
```

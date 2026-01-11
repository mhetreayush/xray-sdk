# X-Ray System

Observability and tracing system with SDK, Core API, and Frontend.

## Architecture

- **SDK** (`packages/xray-sdk`): Client library for instrumenting applications
- **Core API** (`apps/core-api`): Backend service for ingestion and querying
- **Frontend** (`apps/frontend`): Web UI for querying and visualizing traces
- **Example App** (`apps/example-app`): Example Express application using the SDK

## Quick Start

### 1. Start Infrastructure

```bash
docker-compose up -d
```

This starts MongoDB and Kafka locally.

### 2. Create Kafka Topic

```bash
docker exec xray-kafka kafka-topics --create \
  --topic xray-events \
  --bootstrap-server localhost:9092 \
  --partitions 3 \
  --replication-factor 1
```

### 3. Install Dependencies

```bash
pnpm install
```

### 4. Setup Core API

See [apps/core-api/README.md](apps/core-api/README.md) for detailed setup instructions.

### 5. Run Example App

See [apps/example-app/README.md](apps/example-app/README.md) for instructions.

## Development

This is a pnpm workspace monorepo. To work on a specific package:

```bash
cd apps/core-api  # or packages/xray-sdk, etc.
pnpm dev          # Start development mode
```

## PRDs given to coding agent

- [SDK PRD](docs/PRDs/sdk-prd.md)
- [Core API PRD](docs/PRDs/core-api-prd.md)
- [System Summary](docs/XRAY_SYSTEM_SUMMARY.md)

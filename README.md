# X-Ray System

Observability and tracing system with SDK, Core API, and Frontend.

## Architecture

- **SDK** (`packages/xray-sdk`): Client library for instrumenting applications
- **Core API** (`apps/core-api`): Backend service for ingestion and querying
- **Frontend** (`apps/frontend`): Web UI for querying and visualizing traces
- **Example App** (`apps/example-app`): Example Express application using the SDK

## Quick Start

### 1. Installations

- [Docker](https://docs.docker.com/get-docker/)
- [pnpm](https://pnpm.io/installation)

### Install Dependencies

```bash
pnpm install
```

### 3. Start Infrastructure & Services

```bash
pnpm dev
```

- This will start:
  - MongoDB on port 27017
  - Kafka on port 9092
  - Zookeeper (required for Kafka) on port 2181
  - Core API on port 3000
  - Frontend on port 3001
  - Example App on port 3002

## PRDs given to coding agent

- [SDK PRD](docs/PRDs/sdk-prd.md)
- [Core API PRD](docs/PRDs/core-api-prd.md)
- [System Summary](docs/XRAY_SYSTEM_SUMMARY.md)

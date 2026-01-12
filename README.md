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

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Populate core-api env

- Please add the .env file sent to Rishabh in apps/core-api/.env

### 4. Start Infrastructure & Services

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

## Updating the api keys:

- Access the frontend at `http://localhost:3001`

# Steps:

1. Register:

- Go to `http://localhost:3001/register`

2. Create a project:

- Click "Create Project"
- Fill in the project name
- Click "Create Project"

3. Create an API key:

- Go to project
- Click "Settings"
- Click "+ Create API Key"
- Copy the API Key

4. Use the API key in the example-app SDK configuration:

- open `apps/example-app/src/tracer.ts`
- update the API key and project ID
- the example-app will restart on itself

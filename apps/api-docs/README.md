# API Docs

Swagger UI application for viewing and testing the OpenAPI specification.

## Setup

1. Install dependencies:
```bash
pnpm install
```

2. Run development server:
```bash
pnpm dev
```

The Swagger UI will be available at `http://localhost:3003/api-docs` (or configured PORT).

## Features

- Interactive API documentation based on OpenAPI 3.0 specification
- Try-it-out functionality for testing endpoints
- Schema definitions and request/response examples
- Authentication support (Bearer tokens)

## Configuration

The OpenAPI specification is loaded from `index.json` in the root of this app.

To change the port, set the `PORT` environment variable:
```bash
PORT=4000 pnpm dev
```

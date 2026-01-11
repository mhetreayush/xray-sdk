# Example App

Example Express application demonstrating X-Ray SDK usage with REST API endpoints.

## Setup

1. Ensure Core API is running (see `apps/core-api/README.md`)

2. Create a user and project via API:

```bash
# Register a user
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User"
  }'

# Login to get JWT token
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'

# Create a project (replace TOKEN with JWT from login)
curl -X POST http://localhost:3000/api/v1/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "name": "My Project"
  }'

# Create an API key (replace TOKEN and PROJECT_ID)
curl -X POST http://localhost:3000/api/v1/projects/PROJECT_ID/keys \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "name": "Example App Key"
  }'
```

3. Configure the tracer with your API key and project ID:

You can either set environment variables:

```bash
export XRAY_API_KEY="xray_sk_YOUR_API_KEY_HERE"
export XRAY_PROJECT_ID="YOUR_PROJECT_ID_HERE"
export XRAY_BASE_URL="http://localhost:3000"
```

Or update `src/tracer.ts` directly with your credentials.

4. Install dependencies:

```bash
pnpm install
```

5. Build:

```bash
pnpm build
```

6. Run the Express server:

```bash
pnpm start
# or for development with hot reload:
pnpm dev
```

The server will start on port 3002 (or the port specified in the `PORT` environment variable).

## API Endpoints

### List Available Use Cases

```bash
GET http://localhost:3002/api/v1/use-cases
```

### Execute a Use Case

```bash
POST http://localhost:3002/api/v1/use-cases/execute
Content-Type: application/json

{
  "useCase": "competitor-discovery",
  "input": {
    "title": "Wireless Phone Charger Stand",
    "category": "Electronics",
    "price": 24.99,
    "attributes": {
      "brand": "TechBrand",
      "color": "Black",
      "material": "Plastic"
    }
  }
}
```

### Health Check

```bash
GET http://localhost:3002/health
```

## Use Cases

The example app includes two use cases:

- **Competitor Discovery**: Demonstrates trace instrumentation with full SDK setup
- **Product Categorization**: Demonstrates step recording with minimal SDK setup

## Frontend Integration

The frontend includes a dropdown in the project traces page (`/projects/[projectId]/traces`) that allows you to select and test these use cases directly from the UI. Make sure the example app server is running on port 3002 (or configure `NEXT_PUBLIC_EXAMPLE_APP_BASE_URL` in the frontend).

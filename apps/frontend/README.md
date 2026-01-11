# Frontend

Next.js frontend application for X-Ray tracing and querying.

## Setup

1. Install dependencies:
```bash
pnpm install
```

2. Set environment variables (optional, defaults to http://localhost:3000):
```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
```

3. Run development server:
```bash
pnpm dev
```

The app will be available at `http://localhost:3001` (or next available port).

## Features

- **Authentication**: Email/password login and registration
- **Project Selection**: Select a project after login
- **Trace Listing**: View traces for a project (limit 10)
- **Query Builder**: Visual query builder based on schema metadata
  - Supports nested fields (e.g., `filterConfig.priceRange.min`)
  - Multiple conditions with MongoDB operators ($eq, $ne, $gt, etc.)
- **Step Results**: View query results as clickable step cards
- **Trace Detail**: View full trace details with all steps

## Pages

- `/login` - Login page
- `/register` - Registration page
- `/projects` - Project selection
- `/projects/[projectId]/traces` - Traces listing
- `/projects/[projectId]/query` - Query builder and results
- `/projects/[projectId]/traces/[traceId]` - Trace detail view

## Development

The app uses:
- Next.js 14 (App Router)
- TypeScript
- React 18
- Client-side routing and API calls

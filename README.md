# Loan Management System (LMS)

A modern loan management system for managing client information, loan contracts, and transactions. Built with a monorepo architecture featuring a REST API backend and web-based admin portal.

## Features

- **Client Management**: Track borrower information, contact details, and citizen IDs
- **Loan Contract Management**: Handle loan principals, interest rates, terms, and installment schedules
- **Transaction Tracking**: Monitor payments and transaction history
- **Admin Dashboard**: Analytics and overview of loan portfolio
- **Client Portal**: LINE LIFF integration for client-facing features
- **Authentication & Authorization**: Secure access control with Better-auth
- **LINE Integration**: LINE LIFF SDK integration for client portal & Notification

## Tech Stack

### Backend (`/api`)
- **Runtime**: Bun
- **Framework**: Hono v4
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM
- **Authentication**: Better-auth
- **Validation**: Zod
- **Logging**: Pino with pino-pretty

### Frontend (`/web`)
- **Framework**: Preact (React-compatible)
- **Build Tool**: Vite with Rolldown
- **Routing**: Wouter
- **State Management**: Zustand
- **Forms**: React Hook Form + Zod
- **UI Components**: Radix UI
- **Styling**: Tailwind CSS v4
- **HTTP Client**: Axios
- **LINE Integration**: LINE LIFF SDK

## Project Structure

```
/api      - Backend REST API
  /src
    /core              - Infrastructure (config, database, logger, errors)
    /features          - Business domains (clients, loans, users)
    /middleware        - Global middleware
    /routes            - API route definitions
    /libs              - Shared utilities
  /drizzle             - Database migrations
  /script              - Utility scripts
  /docs                - API documentation

/web      - Frontend web application
  /src
    /components        - React components (forms, layout, UI)
    /pages             - Route pages
    /lib               - Utilities (API client, formatters)
    /store             - Zustand state stores
    /hooks             - Custom React hooks
```

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) (v1.0+)
- PostgreSQL (v14+)
- Node.js (v18+) - for some tooling compatibility

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd <project-directory>
   ```

2. **Setup Backend**
   ```bash
   cd api
   bun install
   
   # Configure environment
   cp .env.example .env
   # Edit .env with your database credentials and secrets
   
   # Generate and run migrations
   bun run db:generate
   bun run db:migrate
   ```

3. **Setup Frontend**
   ```bash
   cd ../web
   bun install
   
   # Configure environment
   cp .env.example .env
   # Edit .env with your API URL
   ```

### Development

Run both services in separate terminals:

**Backend (API)**
```bash
cd api
bun run dev
# Runs on http://localhost:3000
```

**Frontend (Web)**
```bash
cd web
bun run dev
# Runs on http://localhost:5555
```

### Database Management

```bash
cd api

# Generate new migration
bun run db:generate

# Run migrations
bun run db:migrate

# Open Drizzle Studio (database GUI)
bun run db:studio
```

### Production Build

**Backend**
```bash
cd api
bun run build
bun run start
```

**Frontend**
```bash
cd web
bun run build
bun run preview
```

## Environment Variables

### API (`/api/.env`)
```env
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
AUTH_SECRET=your-secret-key
PORT=3000
LINE_CHANNEL_ACCESS_TOKEN=your_line_channel_access_token
LINE_CHANNEL_SECRET=your_line_channel_secret
```

### Web (`/web/.env`)
```env
VITE_API_URL=http://localhost:3000
```

## Architecture

### Backend (3-Layer Architecture)

1. **Route Layer**: HTTP request handling and validation
2. **Domain Layer**: Business logic and orchestration
3. **Repository Layer**: Database operations

### API Response Format

All API responses follow a standardized format:
```typescript
{
  success: boolean,
  data?: T,
  error?: { message, code, details },
  meta: { timestamp, requestId }
}
```

### Database Schema

- **Primary Keys**: UUIDv7 for all tables
- **Soft Deletes**: `deleted_at` timestamp
- **Audit Fields**: `created_at`, `updated_at` on all tables
- **Enums**: PostgreSQL enums for status fields
- **Financial Data**: Decimal(12,2) for monetary amounts

## Documentation

- [Database Schema](./api/docs/DATABASE_SCHEMA.md)
- [Schema ERD](./api/docs/SCHEMA_ERD.md)
- [Logging & Errors](./api/docs/LOGGING_AND_ERRORS.md)

## Scripts

### Backend Scripts
```bash
# Seed admin user
bun run script/seed-admin.ts

# Test database connection
bun run script/test-database-connection.ts
```

## Contributing

1. Follow the existing code structure and patterns
2. Use TypeScript strict mode
3. Validate inputs with Zod schemas
4. Follow the 3-layer architecture for backend features
5. Use Radix UI components for frontend UI elements
6. Write meaningful commit messages

## License

[Add your license here]

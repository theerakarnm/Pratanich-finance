# Project Structure

## Monorepo Layout

```
/api      - Backend REST API
/web      - Frontend web application
```

## API Structure (`/api`)

```
/src
  /core                    - Core infrastructure
    /config               - Environment configuration
    /database            - Database connection and schemas
      /schema            - Drizzle ORM schemas (auth, clients, loans)
    /errors              - Custom error classes
    /logger              - Pino logger setup
    /response            - Standardized API response builder
  
  /features              - Business domain features
    /clients            - Client management
    /loans              - Loan contract management
    /users              - User management
    [domain]/
      *.domain.ts       - Business logic layer
      *.repository.ts   - Data access layer
      *.internface.ts   - Interface Declare for the layer
  
  /middleware            - Global middleware
    auth.middleware.ts
    error.middleware.ts
    logger.middleware.ts
    validation.middleware.ts
  
  /routes                - API route definitions
  /libs                  - Shared utilities (auth helpers, etc.)
  index.ts               - Application entry point

/drizzle                 - Generated migrations
/script                  - Utility scripts (seed, test)
/docs                    - Documentation
```

## Web Structure (`/web`)

```
/src
  /components
    /forms               - Form components (ClientForm, LoanContractForm)
    /layout              - Layout components (AdminLayout, auth guards)
    /ui                  - Radix UI component wrappers
  
  /pages                 - Route pages
    Dashboard.tsx
    ClientManagement.tsx
    LoanContractManagement.tsx
    Transaction.tsx
    login.tsx
    LiffClient.tsx       - LINE LIFF integration
  
  /lib                   - Utilities
    api-client.ts        - Axios API client
    auth-client.ts       - Better-auth client
    formatter.ts         - Data formatters
    utils.ts             - General utilities
  
  /store                 - Zustand stores
    admin-auth.ts
  
  /hooks                 - Custom React hooks
  /data                  - Mock data (if any)
  
  app.tsx                - Route definitions
  main.tsx               - Application entry point
  index.css              - Global styles
```

## Architecture Patterns

### Backend (3-Layer Architecture)

1. **Controller/Route Layer**: HTTP request handling, validation
2. **Domain Layer**: Business logic, orchestration
3. **Repository Layer**: Database operations, queries

### Response Format

All API responses follow a standardized format via `ResponseBuilder`:
```typescript
{
  success: boolean,
  data?: T,
  error?: { message, code, details },
  meta: { timestamp, requestId }
}
```

### Database Schema

- **UUIDv7** for primary keys
- **Soft deletes** via `deleted_at` timestamp
- **Timestamps**: `created_at`, `updated_at` on all tables
- **Enums**: PostgreSQL enums for status fields
- **Decimals**: Financial amounts stored as decimal(12,2)

### Frontend Patterns

- **Path aliases**: `@/` maps to `/src`
- **React compatibility**: Preact with `preact/compat` aliases
- **Form validation**: React Hook Form + Zod schemas
- **Protected routes**: `AdminAuthGuard` wrapper component
- **API calls**: Centralized via `api-client.ts`

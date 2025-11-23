# Tech Stack

## Backend (API)

- **Runtime**: Bun
- **Framework**: Hono v4 (lightweight web framework)
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM
- **Authentication**: Better-auth
- **Validation**: Zod
- **Logging**: Pino with pino-pretty
- **Language**: TypeScript (strict mode)

### Key Libraries
- `@hono/zod-validator` - Request validation
- `bcrypt` - Password hashing
- `dayjs` - Date manipulation
- `uuidv7` - UUID generation

## Frontend (Web)

- **Framework**: Preact (React-compatible, lightweight)
- **Build Tool**: Vite (with Rolldown)
- **Routing**: Wouter
- **State Management**: Zustand
- **Forms**: React Hook Form + Zod validation
- **UI Components**: Radix UI primitives
- **Styling**: Tailwind CSS v4
- **HTTP Client**: Axios
- **Authentication**: Better-auth client
- **Charts**: Recharts
- **Notifications**: Sonner
- **Language**: TypeScript

### Special Integrations
- LINE LIFF SDK (`@line/liff`) for client portal

## Common Commands

### API
```bash
# Development (with hot reload)
bun run dev

# Production build
bun run build

# Start production server
bun run start

# Database operations
bun run db:generate    # Generate migrations
bun run db:migrate     # Run migrations
bun run db:studio      # Open Drizzle Studio
```

### Web
```bash
# Development server (port 5555)
bun run dev

# Production build
bun run build

# Preview production build
bun run preview
```

## Build System

- **Package Manager**: Bun (for both API and web)
- **Module System**: ESM (type: "module" in package.json)
- **TypeScript Config**: Strict mode enabled, bundler module resolution

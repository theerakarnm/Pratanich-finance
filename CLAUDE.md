# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a finance line integration application built as a monorepo with two main components:
- **API**: Backend built with Hono, Drizzle ORM, PostgreSQL, and Better-auth
- **Web**: Frontend built with Preact, TypeScript, Tailwind CSS, and Vite

## Development Commands

### API (Backend)
Navigate to `/api` directory for these commands:

- **Development**: `bun run dev` - Start development server with hot reload
- **Build**: `bun run build` - Build for production
- **Start**: `bun run start` - Start production server
- **Database Commands**:
  - `bun run db:generate` - Generate Drizzle migrations
  - `bun run db:migrate` - Run database migrations
  - `bun run db:studio` - Open Drizzle Studio for database management

### Web (Frontend)
Navigate to `/web` directory for these commands:

- **Development**: `bun run dev` - Start Vite development server
- **Build**: `bun run build` - Build for production (includes TypeScript compilation)
- **Preview**: `bun run preview` - Preview production build locally

## Architecture

### Backend Structure (`/api`)
- **Framework**: Hono v4 with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Better-auth for user management
- **Validation**: Zod for request/response validation
- **Logger**: Pino for structured logging

**Directory Structure**:
- `src/core/`: Core modules (config, database, auth, logger, response)
- `src/features/`: Domain-specific features (e.g., users)
- `src/middleware/`: Global middleware (auth, error, logging, validation)
- `src/routes/`: API route definitions
- `src/libs/`: Shared utilities

**Key Files**:
- `src/index.ts`: Main application entry point
- `drizzle.config.ts`: Database configuration
- Environment variables in `.env` (copy from `.env.example`)

### Frontend Structure (`/web`)
- **Framework**: Preact (React alternative) with TypeScript
- **Routing**: Wouter for client-side routing
- **UI Components**: Radix UI primitives with custom components
- **Styling**: Tailwind CSS v4
- **State Management**: React Hook Form with Zod validation
- **Charts**: Recharts for data visualization

**Directory Structure**:
- `src/components/`: Reusable UI components and layout
- `src/components/ui/`: Base UI components (buttons, cards, forms, etc.)
- `src/pages/`: Page components (Dashboard, ClientManagement, LoanContractManagement, Transaction)
- `src/app.tsx`: Main application with routing
- `src/main.tsx`: Application entry point

**Key Features**:
- Admin layout with navigation
- Dashboard with financial overview
- Client management system
- Loan contract management
- Transaction tracking

## Database Setup

1. Configure PostgreSQL connection in `api/.env`
2. Run `bun run db:generate` to create migrations
3. Run `bun run db:migrate` to apply migrations
4. Use `bun run db:studio` for database inspection

## CORS Configuration

The API is configured to accept requests from:
- `http://localhost:3000`
- `http://localhost:5173`

## Development Notes

- The project uses Bun runtime for both the backend and frontend
- TypeScript path aliases are configured (`@/` maps to `src/`)
- Both applications run on different ports during development
- The API serves at `/api` prefix for all routes
# Backend API Boilerplate

This is a backend API boilerplate built with Hono, Drizzle ORM, PostgreSQL, and Better-auth, running on Bun.

## Tech Stack

- **Runtime:** Node.js with Bun
- **Framework:** Hono v4
- **ORM:** Drizzle ORM
- **Database:** PostgreSQL
- **Authentication:** Better-auth
- **Validation:** Zod

## Getting Started

### Prerequisites

- Bun installed
- PostgreSQL database

### Installation

1. Install dependencies:
   ```bash
   bun install
   ```

2. Configure environment variables:
   Copy `.env.example` to `.env` and update the values.
   ```bash
   cp .env.example .env
   ```

3. Generate and migrate database:
   ```bash
   bun run db:generate
   bun run db:migrate
   ```

### Running the App

- **Development:**
  ```bash
  bun run dev
  ```

- **Production Build:**
  ```bash
  bun run build
  ```

- **Start Production:**
  ```bash
  bun run start
  ```

## Project Structure

- `src/core`: Core modules (config, db, auth)
- `src/features`: Domain features (e.g., users, clients, loans, payments, notifications)
- `src/middleware`: Global middleware
- `src/routes`: API routes
- `docs/`: Technical documentation

## Documentation

- [Database Schema](./docs/DATABASE_SCHEMA.md) - Complete database schema documentation
- [Notification Scheduler](./docs/NOTIFICATION_SCHEDULER.md) - Payment notification system guide
- [Notification Migration](./docs/NOTIFICATION_MIGRATION.md) - Database migration details
- [Logging and Errors](./docs/LOGGING_AND_ERRORS.md) - Logging standards and error handling
- [Schema ERD](./docs/SCHEMA_ERD.md) - Entity relationship diagram

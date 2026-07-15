# 11FTC Ticketing Management System

A web-based IT ticket encoding, monitoring, reporting, and analytics platform built for the 11FTC IT department. Integrates with the department's existing Google Sheets workflow via one-way synchronization.

## Architecture

**Modular monolith** with a background sync worker.

| Container | Technology | Purpose |
|---|---|---|
| Web Application | Next.js 15 (App Router) | Ticket forms, employee management, dashboard analytics |
| Application API | NestJS 11 | REST API, business logic, audit logging |
| Sync Worker | NestJS (standalone) | Drains outbox → Google Sheets |
| Database | PostgreSQL | System of record |
| Cache / Queue | Redis | Job queue (BullMQ) + dashboard cache |

## Monorepo Structure

```
├── apps/
│   ├── web/              # Next.js frontend
│   └── api/              # NestJS backend API
├── services/
│   └── sync-worker/      # Google Sheets sync worker
├── packages/
│   ├── shared-types/     # Shared TypeScript types & enums
│   ├── database/         # Prisma schema & client
│   ├── eslint-config/    # Shared ESLint configuration
│   └── tsconfig/         # Shared TypeScript presets
├── documents/            # SRS, System Design, diagrams
└── .agents/              # AI agent skills & context
```

## Prerequisites

- **Node.js** >= 20.0.0
- **pnpm** >= 9.0.0
- **PostgreSQL** >= 15
- **Redis** >= 7

## Getting Started

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# Run database migrations
pnpm db:migrate

# Start all services in development
pnpm dev

# Or start individually
pnpm dev:web      # Next.js on http://localhost:3000
pnpm dev:api      # NestJS on http://localhost:3001
pnpm dev:worker   # Sync worker
```

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start all services in parallel |
| `pnpm dev:web` | Start Next.js frontend only |
| `pnpm dev:api` | Start NestJS API only |
| `pnpm dev:worker` | Start sync worker only |
| `pnpm build` | Build all packages |
| `pnpm lint` | Lint all packages |
| `pnpm format` | Format all files with Prettier |
| `pnpm test` | Run all tests |
| `pnpm db:migrate` | Run Prisma migrations (dev) |
| `pnpm db:generate` | Regenerate Prisma client |
| `pnpm db:studio` | Open Prisma Studio |
| `pnpm typecheck` | Type-check all packages |

## Documentation

- [Software Requirements Specification](documents/11FTC_SRS_Rev3.md) — Authoritative requirements (FR-1 through FR-34)
- [System Design & Architecture](documents/11FTC_System_Design.md) — Architectural decisions and design rationale
- [Traceability Matrix](documents/12-traceability-matrix.md) — FR → use case → diagram mapping

## License

Private — 11FTC IT Department

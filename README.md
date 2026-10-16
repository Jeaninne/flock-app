# Flock

A multi-tenant SaaS for small delivery services: dispatchers plan routes and schedule deliveries, couriers work through a mobile-friendly web app, and customers follow their order on a live map.

> **Status:** in active development — milestone 1 of 6 (foundation). Progress is tracked in [GitHub Issues](https://github.com/Jeaninne/flock-app/issues) or can be checked on [board](https://github.com/users/Jeaninne/projects/1/); the full roadmap is in the [spec](docs/SPEC.md#milestones).

[![CI](https://github.com/Jeaninne/flock-app/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/Jeaninne/flock-app/actions/workflows/ci.yml)

## Documentation

- [Technical specification](docs/SPEC.md) — roles, functional requirements, data model, architecture, API design, non-functional requirements and milestones

## Tech stack

| Layer   | Choice                                                       |
| ------- | ------------------------------------------------------------ |
| Web     | Next.js (App Router, SSR), React, TypeScript, Tailwind       |
| API     | Node.js, Express, TypeScript, Zod, pino                      |
| Data    | PostgreSQL + Prisma, Redis                                   |
| Tooling | pnpm workspaces, ESLint, Prettier, Husky, commitlint, Docker |

Planned: Socket.IO for real-time tracking, BullMQ background jobs, Leaflet + OpenStreetMap, Vitest, Supertest and Playwright — see [Architecture](docs/SPEC.md#architecture-and-tech-stack).

## Project structure

```
apps/
  api/   Express API — REST under /api/v1, Prisma schema, migrations and seed
  web/   Next.js web app
docs/    Technical specification
```

## Local setup

Requirements: Node.js 24+, pnpm, Docker Desktop.

```bash
pnpm install
pnpm docker:up                                   # PostgreSQL + Redis
cp apps/api/.env.example apps/api/.env           # Windows: Copy-Item
pnpm db:migrate                                  # apply database migrations
pnpm db:seed                                     # demo company with a week of orders and routes
pnpm dev                                         # web on :3000, API on :4000
```

The seed is idempotent: it recreates the demo company's data on every run, with dates relative to today.

| Service    | URL                                       |
| ---------- | ----------------------------------------- |
| Web        | http://localhost:3000                     |
| API        | http://localhost:4000/api/v1              |
| Health     | http://localhost:4000/api/v1/health       |
| Readiness  | http://localhost:4000/api/v1/health/ready |
| PostgreSQL | localhost:5432 (flock_admin / flock_dev)  |
| Redis      | localhost:6379                            |

### Useful scripts

| Command            | What it does                            |
| ------------------ | --------------------------------------- |
| `pnpm lint`        | ESLint across all apps                  |
| `pnpm typecheck`   | TypeScript check across all apps        |
| `pnpm build`       | Production build of all apps            |
| `pnpm db:studio`   | Prisma Studio for browsing the database |
| `pnpm docker:down` | Stop PostgreSQL and Redis               |

## Conventions

Commits follow [Conventional Commits](https://www.conventionalcommits.org/) and are checked by commitlint; staged files are linted and formatted on commit. Changes go through pull requests linked to issues.

## Data sources

Demo addresses in `apps/api/prisma/seed-data/addresses.json` come from [OpenStreetMap](https://www.openstreetmap.org/copyright) via Nominatim: © OpenStreetMap contributors, available under the [Open Database License (ODbL)](https://opendatacommons.org/licenses/odbl/).

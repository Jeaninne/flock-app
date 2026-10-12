# Flock

A multi-tenant SaaS for small delivery services: dispatchers plan routes and schedule deliveries, couriers work through a mobile-friendly web app, and customers follow their order on a live map.

## Local setup

Requirements: Node.js 24+, pnpm, Docker Desktop.

```bash
pnpm install
pnpm docker:up                                   # PostgreSQL + Redis
cp apps/api/.env.example apps/api/.env           # Windows: Copy-Item
pnpm dev                                         # web on :3000, API on :4000
```

| Service    | URL                                      |
| ---------- | ---------------------------------------- |
| Web        | http://localhost:3000                    |
| API        | http://localhost:4000/api/v1             |
| PostgreSQL | localhost:5432 (flock_admin / flock_dev) |
| Redis      | localhost:6379                           |

## Data sources

Demo addresses in `apps/api/prisma/seed-data/addresses.json` come from [OpenStreetMap](https://www.openstreetmap.org/copyright) via Nominatim: © OpenStreetMap contributors, available under the [Open Database License (ODbL)](https://opendatacommons.org/licenses/odbl/).

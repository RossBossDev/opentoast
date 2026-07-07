# Review Radar

Review Radar is a NestJS API and worker service for tracking GitHub pull request attention and delivering Slack reminders/digests.

Product documentation: https://rossbossdev.github.io/review-radar/

## Prerequisites

- Node.js 24.18.0 (`nvm use`)
- pnpm 11.10.0 via Corepack
- Docker Compose

## Install

```bash
corepack enable
corepack prepare pnpm@11.10.0 --activate
pnpm install
```

## Environment

```bash
cp apps/backend/.env.example apps/backend/.env
```

Fill in GitHub App and Slack secrets before using real integrations.

## Local services

Start Postgres and Redis/Valkey:

```bash
docker compose up -d postgres redis
```

Run migrations:

```bash
pnpm db:migrate
```

List migrations:

```bash
pnpm db:migrate:list
```

## Development

`PROCESS_ROLE` controls which responsibilities a backend process runs:

- `all` — HTTP API, BullMQ processors, and heartbeat scheduling. Default for local dev.
- `api` — HTTP API and queue producers only.
- `worker` — BullMQ processors only; no HTTP listener.
- `heartbeat` — scheduled enqueueing only; no HTTP listener or processors.

Start the local all-in-one process:

```bash
pnpm dev
```

Run split production-style roles:

```bash
PROCESS_ROLE=api pnpm --filter backend start:prod
PROCESS_ROLE=worker pnpm --filter backend start:worker
PROCESS_ROLE=heartbeat pnpm --filter backend start:prod
```

Health endpoints:

- `GET /health/live` — process liveness
- `GET /health/ready` — database readiness
- `GET /health` — readiness alias

## Checks

```bash
pnpm check
pnpm build
pnpm test
```

Generate database types after schema changes:

```bash
pnpm db:types
```

## Docker

Run the full local stack:

```bash
docker compose up --build
```

Build the production image:

```bash
docker build -t review-radar .
```

Migrations should run as an explicit release/deploy step before starting API, worker, or heartbeat containers.

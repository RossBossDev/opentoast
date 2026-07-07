# Review Radar

Review Radar is a NestJS API and worker service for tracking GitHub pull request attention and delivering Slack reminders/digests.

Product documentation: https://rossbossdev.github.io/opentoast/

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

## Local database

Start Postgres:

```bash
docker compose up -d postgres
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

Start the API:

```bash
pnpm dev
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
docker build -t opentoast .
```

Migrations should run as an explicit release/deploy step before starting API or worker containers.

# Scaffold Reference

This project was generated using the Ross Nest Scaffold skill with the following information.

- Project name: `review-radar`
- Scaffold date: 2026-07-05
- Node version: `v24.18.0`
- pnpm version: `11.10.0`
- Package manager: `pnpm@11.10.0`
- Selected optional add-ons: none
- Explicitly skipped add-ons: Better Auth, frontend, queue, Swagger, VitePress docs, iOS

## Baseline choices

- PNPM monorepo
- Nest backend in `apps/backend`
- Postgres for local/self-hosted persistence
- Kysely with `kysely-ctl` migrations and `kysely-codegen`
- Vitest for unit/e2e tests
- Biome for formatting/lint checks
- Left Hook pre-commit check hook
- Docker Compose with API, worker, and Postgres services
- GitHub Actions CI running check, build, and test

## Validation commands

```bash
pnpm install
pnpm check
pnpm build
pnpm test
docker compose up -d postgres
pnpm db:migrate
```

## Manual follow-ups

- Copy `apps/backend/.env.example` to `apps/backend/.env` and replace placeholder GitHub/Slack secrets.
- Run migrations as an explicit deploy/release step before starting production API or worker containers.

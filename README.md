# LifeOS

AI-native personal development operating system focused on the loop:

```text
CAPTURE → CLARIFY → CHOOSE → ACT → REFLECT → ADAPT
```

> Current status: Engineering Milestone 1 / foundation exit integration. Product semantics are defined in `docs/` and meeting decisions in `meetings/`.

## Foundation stack

- Node.js 24 LTS
- pnpm workspace
- React + Vite web/PWA shell
- Fastify API
- PostgreSQL 18 local development service
- shared domain contracts in `packages/domain`

## Repository layout

```text
apps/
  api/
  web/
packages/
  domain/
  db/
scripts/
docs/
meetings/
```

Additional packages from the Engineering Blueprint are added only when an implementation issue owns them; we avoid empty architecture ceremony.

## Fresh-clone development path

Requirements:
- Node.js 24+
- Corepack
- Docker with Docker Compose

Install dependencies once:

```bash
corepack enable
pnpm install
```

Then boot the complete foundation with one command:

```bash
pnpm dev:stack
```

`dev:stack` performs the foundation boot sequence in dependency order:

1. starts PostgreSQL from `compose.dev.yml`;
2. waits until PostgreSQL is ready;
3. applies Drizzle migrations;
4. starts the shared-package watchers, API and Web app.

A local `.env` is optional. When it is absent, development-only defaults matching `.env.example` are used. To customize ports or credentials:

```bash
cp .env.example .env
```

Do not commit `.env`; repository ignore rules permit only `.env.example`.

Default endpoints:
- Web: `http://localhost:3222`
- API health: `http://localhost:4000/health`
- API readiness: `http://localhost:4000/ready`

During Vite development, `/health` and `/ready` are proxied to the API. The default product contract is same-origin so the app does not require permissive CORS merely for local development.

Stopping `pnpm dev:stack` stops application processes but deliberately leaves the PostgreSQL container and named volume available for the next development session. PostgreSQL 18 stores its versioned `PGDATA` below `/var/lib/postgresql`; `compose.dev.yml` therefore mounts the named volume at `/var/lib/postgresql` so data survives container recreation.

## Verification

Run the essential local checks with:

```bash
pnpm verify
```

This executes strict typecheck, tests and production builds across the workspace. CI invokes this exact same `pnpm verify` entry point before adding infrastructure-specific gates.

With PostgreSQL available, run the complete foundation exit smoke with:

```bash
pnpm verify:foundation
```

The foundation smoke:
- reapplies migrations to prove the migration path is idempotent;
- starts the built API on an isolated verification port;
- starts the built Web preview;
- requests `/health` through the Web origin;
- requests `/ready` through the Web origin and requires the API database check to be `ok`.

GitHub CI adds destructive/isolated infrastructure gates that are inappropriate for normal local development: local-secret ignore enforcement, malformed environment startup, unavailable-database readiness, migration drift, transaction rollback, PostgreSQL named-volume persistence across container recreation, and built Web → API → DB smoke.

## Product guardrails

Coding work must follow the canonical decisions in:
- `docs/MVP_SCOPE_V1.md`
- `docs/ENGINEERING_BLUEPRINT_V1.md`
- `docs/DOMAIN_MODEL_V1.md`
- `docs/PERSONAL_INTELLIGENCE_ENGINE_V1.md`

Do not silently add new top-level modules, permanent domain statuses, psychological scoring, AI autonomy, graph databases or ML ranking without an explicit product/domain decision.

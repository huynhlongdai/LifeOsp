# LifeOS

AI-native personal development operating system focused on the loop:

```text
CAPTURE → CLARIFY → CHOOSE → ACT → REFLECT → ADAPT
```

> Current status: Engineering Milestone 1 / foundation bootstrap. Product semantics are defined in `docs/` and meeting decisions in `meetings/`.

## Foundation stack

- Node.js 24 LTS
- pnpm workspace
- React + Vite web/PWA shell
- Fastify API
- PostgreSQL local development service
- shared domain contracts in `packages/domain`

## Repository layout

```text
apps/
  api/
  web/
packages/
  domain/
docs/
meetings/
```

Additional packages from the Engineering Blueprint are added only when an implementation issue owns them; we avoid empty architecture ceremony.

## Local development

Requirements:
- Node.js 24+
- Corepack
- Docker / Docker Compose if running PostgreSQL locally

```bash
corepack enable
pnpm install

# Optional foundation database service
cp .env.example .env
docker compose -f compose.dev.yml up -d postgres

# Run web + API
pnpm dev
```

Default endpoints:
- Web: `http://localhost:3222`
- API health: `http://localhost:4000/health`
- API readiness: `http://localhost:4000/ready`

During Vite development, `/health` and `/ready` are proxied to the API. The default product contract is same-origin so the app does not require permissive CORS merely for local development.

## Verification

```bash
pnpm typecheck
pnpm test
pnpm build
```

GitHub CI runs the same essential checks on pull requests.

## Product guardrails

Coding work must follow the canonical decisions in:
- `docs/MVP_SCOPE_V1.md`
- `docs/ENGINEERING_BLUEPRINT_V1.md`
- `docs/DOMAIN_MODEL_V1.md`
- `docs/PERSONAL_INTELLIGENCE_ENGINE_V1.md`

Do not silently add new top-level modules, permanent domain statuses, psychological scoring, AI autonomy, graph databases or ML ranking without an explicit product/domain decision.

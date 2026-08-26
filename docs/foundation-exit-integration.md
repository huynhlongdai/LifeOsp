# Foundation Exit Integration

This document records the verification boundary for Meeting #014 Increment C.

## Commands
- `pnpm dev:stack` — PostgreSQL → readiness wait → migration → Web/API/shared dev processes.
- `pnpm verify` — workspace typecheck, tests and production build.
- `pnpm foundation:smoke` — idempotent migration plus built Web → built API → PostgreSQL readiness smoke.
- `pnpm verify:foundation` — root verification sequence when PostgreSQL is available.

## Exit gates
Foundation remains blocked until CI proves:
1. strict typecheck/tests/build;
2. PWA build assets;
3. malformed API environment fails fast;
4. migration drift is clean;
5. clean migration and transaction rollback;
6. built API → DB readiness;
7. built Web → API → DB same-origin smoke;
8. unavailable database returns healthy liveness but degraded readiness;
9. PostgreSQL 18 named-volume data survives container recreation.

## PostgreSQL 18 persistence correction
The PostgreSQL 18 Docker image uses versioned PGDATA below `/var/lib/postgresql`. The local named volume therefore mounts at `/var/lib/postgresql`, not the PostgreSQL 17-and-earlier `/var/lib/postgresql/data` path.

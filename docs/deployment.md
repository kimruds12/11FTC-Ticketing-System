# Deployment & local development (Docker)

The system is three runnable pieces plus two managed dependencies:

| Piece | Image | Command |
|---|---|---|
| API | `11ftc/api` | `node dist/main.js` |
| Sync worker | `11ftc/api` (same image) | `node dist/main.worker.js` |
| Web | `11ftc/web` | `node apps/web/server.js` (Next standalone) |

| Managed dependency | Where |
|---|---|
| Postgres + Supabase Auth | **Supabase** (session pooler on 5432; JWKS for auth) — never containerized |
| Redis (BullMQ trigger bus) | Managed in prod; a local container in dev |

> **Decision (recorded):** data and auth are **remote Supabase** in every environment.
> There is no local Postgres. Supabase Auth/JWKS is remote by nature, so pointing dev at a
> real Supabase project keeps dev and prod on the same auth path. See ADR-0001.

## Prerequisites

- Docker + Docker Compose.
- A `.env` at the repo root (`cp .env.example .env`), with the remote Supabase
  `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_JWKS_URL`, and the `NEXT_PUBLIC_*` values.
- A committed `pnpm-lock.yaml`. The production Dockerfiles use `--frozen-lockfile`, so run
  `pnpm install` once at the repo root to generate the lockfile before `docker:build`.

## Local development

```bash
cp .env.example .env      # fill in remote Supabase values
docker compose up         # or: pnpm docker:dev
```

- Runs `api`, `worker`, `web` from the `node:20` base image with the source **bind-mounted**
  and `pnpm dev` (watch) — edit a file, the process reloads, no rebuild.
- Runs a local **Redis** container; `REDIS_URL` is set to `redis://redis:6379` for the
  compose network. To use a managed Redis instead, change `REDIS_URL` in the `api`/`worker`
  service environment.
- Ports: web `:3000`, api `:3001`, redis `:6379`.
- First `up` runs `pnpm install` into named volumes (slow once, fast after).

**Windows note.** Bind-mounted `node_modules` can be slow. If iteration drags, run
`pnpm dev` on the host and use compose only for Redis (`docker compose up redis`).

## How the containers talk (networking)

`docker compose` does **not** run one container — each service is its **own** container.
Compose places them all on one shared network so they can reach each other by **service
name** as a hostname. There are two distinct paths, and only one needs a `ports:` line.

```
docker compose up  ──▶  one project, one network:

   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐
   │  redis  │   │  api    │   │  worker │   │  web    │
   └─────────┘   └─────────┘   └─────────┘   └─────────┘
        ▲             │             │             │
        └── redis://redis:6379 ─────┘             │
                 all on the same private network ─┘
```

1. **Container → container (internal network).** Uses the service name + the container's
   internal port directly — `api`/`worker` reach Redis at `redis://redis:6379` simply
   because they share the network. **No port publishing is required** for this.
2. **Host → container (published ports).** `ports: ["host:container"]` forwards a port *out*
   of the container to your machine, so *you* can open `localhost:3000` or run `redis-cli`.
   This is only about host access — it is never needed for services to talk to each other.

What each service publishes, and why:

| Service | `ports:` | Reason |
|---|---|---|
| `web` | `3000:3000` | you open it in a browser |
| `api` | `3001:3001` | you call it from the browser / tools |
| `redis` | `6379:6379` | published only so *you* can inspect it locally; api/worker don't need it |
| `worker` | none | nothing connects *to* it — it only makes **outbound** connections |

The worker having no published ports is the proof of the rule: it still talks to Redis
fine (path 1), but publishes nothing because nothing outside needs to reach it. **Publish
the minimum** — in production you typically publish only the public edge (web) and keep
Redis and internal APIs reachable on the private network only.

## Production build & run

```bash
pnpm install                       # ensure pnpm-lock.yaml exists
pnpm docker:build                  # docker compose -f docker-compose.prod.yml build
pnpm docker:prod                   # up -d
```

- Multi-stage builds via `turbo prune --docker` → small context, cached install layer,
  non-root runtime.
- `api` and `worker` share **one** image and differ only by command (System Design §2).
- `web` uses Next.js `output: 'standalone'`. `NEXT_PUBLIC_*` are build args (inlined at
  build time), passed through `docker-compose.prod.yml`.
- **No Redis container in prod.** `docker-compose.prod.yml` runs only `api`/`worker`/`web`;
  Redis is a managed service. The only change from dev is the connection URLs in `.env` —
  point `REDIS_URL` at the managed Redis (and `DATABASE_URL`/`SUPABASE_*` at Supabase). The
  app images and code are identical to dev; only env values differ.
- For a registry/orchestrator: push `11ftc/api` and `11ftc/web`, reuse the service
  definitions as your deployment template.

## Migrations

Migrations run against the managed database, not inside the app images:

```bash
pnpm db:generate    # drizzle-kit generate from packages/db/src/schema
pnpm db:migrate     # apply to DATABASE_URL
```

Run `db:migrate` as a release step (CI job or one-off) before rolling the new API image.
**No seed data** ships in migrations — departments and main-issue categories are OPEN-4.

## What is intentionally NOT here

- **No local Postgres container.** Remote Supabase is the system of record everywhere.
- **No Bull Board service yet.** It will be exposed by the worker process once M8 lands.
- **No reverse proxy / TLS.** Add your platform's ingress (or a Caddy/Traefik front) at
  deploy time; it's environment-specific and out of scope for this repo.

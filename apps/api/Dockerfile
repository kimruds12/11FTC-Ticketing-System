# syntax=docker/dockerfile:1
# Multi-stage build for the NestJS API AND the sync worker — same image, two entrypoints
# (System Design §2). The worker service in compose overrides CMD to run main.worker.js.
#
# Uses Turborepo's `prune --docker` so the build context and install layer only contain
# what @11ftc/api actually needs. Requires a committed pnpm-lock.yaml (run `pnpm install`
# once at the repo root to generate it).

FROM node:20-alpine AS base
RUN corepack enable
WORKDIR /app

# --- Prune the monorepo down to the api workspace + its internal deps ---
FROM base AS pruner
COPY . .
RUN pnpm dlx turbo@2.10.5 prune @11ftc/api --docker

# --- Install deps (cached on lockfile) then build ---
FROM base AS installer
COPY --from=pruner /app/out/json/ .
RUN pnpm install --frozen-lockfile
COPY --from=pruner /app/out/full/ .
RUN pnpm turbo run build --filter=@11ftc/api

# --- Slim runtime ---
FROM base AS runner
ENV NODE_ENV=production
# Run as the built-in non-root node user.
USER node
COPY --from=installer --chown=node:node /app .
WORKDIR /app/apps/api
EXPOSE 3001
# API entrypoint. Worker overrides this with: node dist/main.worker.js
CMD ["node", "dist/main.js"]

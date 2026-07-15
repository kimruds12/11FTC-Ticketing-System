# syntax=docker/dockerfile:1
# Multi-stage build for the Next.js web app, using standalone output for a slim runtime.
# Requires `output: 'standalone'` in next.config.mjs and a committed pnpm-lock.yaml.

FROM node:20-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS pruner
COPY . .
RUN pnpm dlx turbo@2.10.5 prune @11ftc/web --docker

FROM base AS installer
COPY --from=pruner /app/out/json/ .
RUN pnpm install --frozen-lockfile
COPY --from=pruner /app/out/full/ .
# NEXT_PUBLIC_* vars are inlined at build time — pass them as build args in CI/compose.
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
RUN pnpm turbo run build --filter=@11ftc/web

FROM base AS runner
ENV NODE_ENV=production
USER node
# Standalone output bundles a minimal server + only the node_modules it traced.
COPY --from=installer --chown=node:node /app/apps/web/.next/standalone ./
COPY --from=installer --chown=node:node /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=installer --chown=node:node /app/apps/web/public ./apps/web/public
EXPOSE 3000
CMD ["node", "apps/web/server.js"]

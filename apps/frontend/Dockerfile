# ---- Stage 1: Build ----
FROM node:22-bookworm-slim AS builder

RUN corepack enable && corepack prepare pnpm@11.9.0 --activate

WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/frontend/package.json ./apps/frontend/package.json
COPY packages/shared/package.json ./packages/shared/package.json

RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --filter frontend...

COPY apps/frontend ./apps/frontend
COPY packages/shared ./packages/shared

RUN pnpm --filter @zownload/shared build

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

RUN pnpm --filter frontend build

# ---- Stage 2: Runtime ----
FROM node:22-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Standalone output includes its own minimal node_modules + server.js
COPY --from=builder /app/apps/frontend/.next/standalone ./
COPY --from=builder /app/apps/frontend/.next/static ./apps/frontend/.next/static
COPY --from=builder /app/apps/frontend/public ./apps/frontend/public    

EXPOSE 3000

CMD ["node", "apps/frontend/server.js"]
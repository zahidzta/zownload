FROM node:22-bookworm-slim AS builder

RUN corepack enable && corepack prepare pnpm@11.9.0 --activate

WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

COPY apps/backend/package.json ./apps/backend/package.json
COPY packages/shared/package.json ./packages/shared/package.json

RUN pnpm install --frozen-lockfile --filter backend...

COPY apps/backend ./apps/backend
COPY packages/shared ./packages/shared

RUN pnpm --filter @zownload/shared build
RUN pnpm --filter backend build

RUN pnpm --filter backend deploy --prod /app/deploy

FROM node:22-bookworm-slim AS runner

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    ffmpeg \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp

WORKDIR /app

COPY --from=builder /app/deploy ./
EXPOSE 4000

CMD ["node", "dist/index.js"]
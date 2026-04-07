FROM node:24-alpine AS runtime

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json backend/package.json

RUN pnpm install --filter @iot-2026/backend --prod --frozen-lockfile

COPY backend backend
COPY shared shared
COPY ops/ota-releases.json ops/ota-releases.json

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["pnpm", "--dir", "backend", "worker:start"]

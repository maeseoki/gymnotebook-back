FROM node:24-alpine AS base

RUN corepack enable && corepack prepare pnpm@11.5.2 --activate

FROM base AS deps
WORKDIR /app
COPY pnpm-workspace.yaml package.json ./
COPY pnpm-lock.yaml ./
COPY packages/typescript-config/package.json ./packages/typescript-config/
COPY packages/contracts/package.json ./packages/contracts/
COPY apps/api/package.json ./apps/api/
RUN pnpm install --frozen-lockfile --filter @gymnotebook/api...

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/contracts/node_modules ./packages/contracts/node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY . .
RUN pnpm install --frozen-lockfile --offline --filter @gymnotebook/api...
RUN pnpm --filter @gymnotebook/contracts build
RUN pnpm --filter @gymnotebook/api build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/contracts/node_modules ./packages/contracts/node_modules
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/packages/contracts/dist ./packages/contracts/dist
COPY --from=builder /app/packages/contracts/package.json ./packages/contracts/
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/apps/api/drizzle ./apps/api/drizzle
EXPOSE 8080
USER node
CMD ["node", "apps/api/dist/src/server.js"]

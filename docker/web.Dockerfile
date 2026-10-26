FROM node:22-alpine AS builder
WORKDIR /app

RUN npm install -g pnpm

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/shared-types ./packages/shared-types
COPY apps/web ./apps/web

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @enterprise-chat/shared-types build
RUN pnpm --filter @enterprise-chat/web build

FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
RUN npm install -g pnpm

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY --from=builder /app/apps/web/package.json ./apps/web/package.json
COPY --from=builder /app/apps/web/.next ./apps/web/.next
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/packages/shared-types ./packages/shared-types

RUN pnpm install --prod --frozen-lockfile

EXPOSE 3000
CMD ["pnpm", "--filter", "@enterprise-chat/web", "start"]

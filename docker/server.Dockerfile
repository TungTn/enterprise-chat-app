FROM node:22-alpine AS builder
WORKDIR /app

RUN npm install -g pnpm

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/shared-types ./packages/shared-types
COPY apps/server ./apps/server

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @enterprise-chat/shared-types build
RUN pnpm --filter @enterprise-chat/server exec prisma generate
RUN pnpm --filter @enterprise-chat/server build

FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
RUN npm install -g pnpm

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY --from=builder /app/packages/shared-types/dist ./packages/shared-types/dist
COPY --from=builder /app/packages/shared-types/package.json ./packages/shared-types/package.json
COPY --from=builder /app/apps/server/dist ./apps/server/dist
COPY --from=builder /app/apps/server/prisma ./apps/server/prisma
COPY --from=builder /app/apps/server/package.json ./apps/server/package.json

RUN pnpm install --prod --frozen-lockfile

EXPOSE 4000
CMD ["node", "apps/server/dist/main.js"]

FROM node:24-alpine AS base
WORKDIR /workspace

COPY tsconfig.base.json ./tsconfig.base.json
COPY packages/shared ./packages/shared
COPY apps/backend ./apps/backend

WORKDIR /workspace/packages/shared
RUN npm install && npm run build

WORKDIR /workspace/apps/backend
RUN npm install && npm run build

FROM node:24-alpine AS runtime
WORKDIR /app

COPY --from=base /workspace/packages/shared /app/packages/shared
COPY --from=base /workspace/apps/backend/node_modules /app/node_modules
COPY --from=base /workspace/apps/backend/dist /app/dist
COPY --from=base /workspace/apps/backend/prisma /app/prisma
COPY apps/backend/package.json ./package.json

EXPOSE 3000

CMD ["node", "dist/apps/backend/src/main.js"]

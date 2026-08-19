FROM node:24-alpine AS base
WORKDIR /workspace

COPY package.json package-lock.json ./
COPY tsconfig.base.json ./tsconfig.base.json
COPY packages/shared/package.json ./packages/shared/package.json
COPY apps/backend/package.json ./apps/backend/package.json

RUN npm ci

COPY packages/shared ./packages/shared
COPY apps/backend ./apps/backend

RUN npm --prefix apps/backend run prisma:generate
RUN npm run build:shared && npm run build:backend

FROM node:24-alpine AS runtime
WORKDIR /app

COPY --from=base /workspace/node_modules /app/node_modules
RUN mkdir -p /app/node_modules/@solidarity-network
COPY --from=base /workspace/packages/shared /app/node_modules/@solidarity-network/shared
COPY --from=base /workspace/apps/backend/dist /app/dist
COPY --from=base /workspace/apps/backend/prisma /app/prisma
COPY apps/backend/package.json ./package.json

RUN chown -R node:node /app
USER node

EXPOSE 3000

CMD ["npm", "run", "start:prod"]

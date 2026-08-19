FROM node:24-alpine AS build
WORKDIR /workspace

COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/package.json
COPY apps/frontend/package.json ./apps/frontend/package.json

RUN npm ci

COPY packages/shared ./packages/shared
COPY apps/frontend ./apps/frontend

RUN npm run build:shared && npm run build:frontend

FROM nginx:1.27-alpine AS runtime
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/apps/frontend/dist/solidarity-network-frontend/browser /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

FROM node:24-alpine AS build
WORKDIR /workspace

COPY packages/shared ./packages/shared
COPY apps/frontend ./apps/frontend

WORKDIR /workspace/packages/shared
RUN npm install && npm run build

WORKDIR /workspace/apps/frontend
RUN npm install && npm run build

FROM nginx:1.27-alpine AS runtime
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/apps/frontend/dist/solidarity-network-frontend/browser /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]


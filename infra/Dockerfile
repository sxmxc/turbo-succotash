FROM node:24.20.0-bookworm-slim@sha256:ba849c60be29959425b8734d57b8b4b7d56f98edd9504c9af091d5281095a71e AS build
WORKDIR /app
RUN npm install --global npm@12.0.2
COPY package.json package-lock.json .npmrc ./
COPY apps/web/package.json apps/web/package.json
COPY services/identity/package.json services/identity/package.json
COPY services/api/package.json services/api/package.json
COPY services/realtime/package.json services/realtime/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/service-runtime/package.json packages/service-runtime/package.json
RUN npm ci
COPY . .
ARG BUILD_COMMIT=development
ENV BUILD_COMMIT=$BUILD_COMMIT
RUN npm run build
FROM build AS production-deps
RUN npm prune --omit=dev
FROM node:24.20.0-bookworm-slim@sha256:ba849c60be29959425b8734d57b8b4b7d56f98edd9504c9af091d5281095a71e AS service
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0
ARG BUILD_COMMIT=development
ARG PRODUCT_VERSION=development
ENV BUILD_COMMIT=$BUILD_COMMIT
LABEL org.opencontainers.image.revision=$BUILD_COMMIT org.opencontainers.image.version=$PRODUCT_VERSION
COPY --from=production-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/infra/migrations ./infra/migrations
USER node
FROM service AS identity
CMD ["node","dist/services/identity/src/main.js"]
FROM service AS api
CMD ["node","dist/services/api/src/main.js"]
FROM service AS realtime
CMD ["node","dist/services/realtime/src/main.js"]
FROM service AS migrate
CMD ["node","dist/scripts/migrate.js"]
FROM nginx:1.30.4-alpine@sha256:dc5069ad14f19660b141b21236140b91656bf89bbc3e2417c70ae650cd66104c AS web
ARG BUILD_COMMIT=development
ARG PRODUCT_VERSION=development
LABEL org.opencontainers.image.revision=$BUILD_COMMIT org.opencontainers.image.version=$PRODUCT_VERSION
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
COPY infra/compose/nginx.conf /etc/nginx/conf.d/default.conf

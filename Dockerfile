# Builds the production image. See "Deployment" in README.md.

# Keep NODE_VERSION equal to the node version in mise.toml.
ARG NODE_VERSION=24.22.1

FROM node:${NODE_VERSION}-slim AS client
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY vite.config.ts tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:${NODE_VERSION}-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:${NODE_VERSION}-slim
ENV NODE_ENV=production \
    PORT=3000 \
    IMAGES_DIR=/data/images
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY migrations ./migrations
COPY src/server ./src/server
COPY src/shared ./src/shared
COPY --from=client /app/dist/client ./dist/client
RUN mkdir -p /data/images && chown -R node:node /data
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD node -e "fetch('http://localhost:' + process.env.PORT + '/health').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"
CMD ["node", "src/server/main.ts"]

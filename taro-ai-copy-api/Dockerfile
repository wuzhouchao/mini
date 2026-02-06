# 构建阶段（使用国内镜像源，避免 Docker Hub 拉取超时；有代理时可改回 node:20-alpine）
FROM docker.m.daocloud.io/library/node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# 运行阶段
FROM docker.m.daocloud.io/library/node:20-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/index.js"]

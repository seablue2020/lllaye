FROM node:20-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-slim AS production

WORKDIR /app

# 从 Debian 归档手动解压 libssl1.1（Bookworm 已移除此包）
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates wget dpkg && \
    mkdir -p /tmp/libssl && \
    cd /tmp/libssl && \
    wget -q https://archive.debian.org/debian/pool/main/o/openssl/libssl1.1_1.1.1w-0+deb11u1_amd64.deb && \
    dpkg-deb -x libssl1.1_1.1.1w-0+deb11u1_amd64.deb / && \
    ldconfig && \
    cd / && rm -rf /tmp/libssl && \
    rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install --omit=dev

COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/templates ./templates

# 强制重新生成 Prisma Client（使用当前安装的 Prisma 6，而非 builder 缓存的 Prisma 5）
RUN npx prisma generate

COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["node", "dist/src/main"]

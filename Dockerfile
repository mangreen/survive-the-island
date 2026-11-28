# 絕命島求生 — 多階段 Dockerfile
#
# 相容性目標：Docker Engine 20.10 / Docker Desktop 4.12（macOS Big Sur）。
# 不使用 BuildKit 專屬語法（--mount、heredoc、# syntax= 指令），經典 builder 也能建置。
#
# 目標（--target）：
#   dev    開發用：依賴已安裝，compose 以 bind mount 掛入原始碼
#   build  建置全部套件
#
# 想試 Node 24：docker compose build --build-arg NODE_IMAGE=node:24-alpine
# 或直接 NODE_IMAGE=node:24-alpine make dev

ARG NODE_IMAGE=node:22-alpine

# ---------- base ----------
FROM ${NODE_IMAGE} AS base
WORKDIR /app
# pnpm 版本由 package.json 的 packageManager 欄位固定
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable

# ---------- dev ----------
# 先只複製 manifest 與 lockfile，原始碼變動時依賴層仍可用快取
FROM base AS dev
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/
COPY packages/rules/package.json packages/rules/
RUN pnpm install --frozen-lockfile
COPY . .
EXPOSE 5173
CMD ["pnpm", "dev"]

# ---------- build ----------
FROM dev AS build
RUN pnpm run build

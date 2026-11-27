# ADR-0001：技術堆疊與 repo 結構

- 狀態：已接受（2026-11-27，擁有者同意合併 M0）
- 日期：2026-11-27

## 背景

純網頁遊戲，前後端要共用規則與協定型別。開發機是 macOS Big Sur 上的 Docker Desktop 4.12.0，
主機不假設有裝 Node。

## 選項

1. 單一套件：最簡單，但規則、協定、伺服器混在一起，邊界容易被穿透。
2. pnpm workspace（monorepo）：多一點設定，換到清楚的模組邊界。

## 決定

- pnpm workspace、TypeScript（strict）。套件在用到時才建立：M1 `packages/rules`，M3 `apps/server` 與協定。
- Vite、React（只做 HUD）、three.js（用 npm 打包，不走 CDN）。
- Vitest、ESLint、Prettier、GitHub Actions。M1 起加 fast-check。
- 容器基礎映像 `node:22-alpine`；CI 同時驗證 Node 24。
- Compose 只 bind mount 原始碼，`node_modules` 留在映像內。原計畫是把它放 named volume，
  但依賴改變後 volume 不會跟著更新，容易出現舊依賴，所以改掉。改依賴後 `make dev` 會重建映像。

## 影響

- 改 `package.json`、設定檔等未掛載的檔案後，要重啟 `make dev`。
- Node 22 在 2027 年 4 月結束支援。Mac 上確認 Node 24 映像可用後，另開 PR 切換。
- CI 的 Docker 版本比 Mac 新。「在 20.10 上能跑」只能由 Mac 實測確認。

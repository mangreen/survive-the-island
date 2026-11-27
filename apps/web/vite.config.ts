import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  // three.js 打包後約 800 kB；這是 3D 遊戲的必要依賴，門檻放寬到能抓出異常成長即可
  build: { chunkSizeWarningLimit: 900 },
  server: {
    port: 5173,
    strictPort: true,
    // Docker Desktop for Mac 的 bind mount 可能收不到檔案變更事件，容器內改用輪詢
    watch: process.env.VITE_USE_POLLING === 'true' ? { usePolling: true, interval: 500 } : {},
  },
});

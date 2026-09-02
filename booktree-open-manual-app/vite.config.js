import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // open: true 는 브라우저가 없는 환경(WSL·컨테이너·CI)에서 오류를 냅니다.
    // 자동으로 열고 싶으면 `npm run dev -- --open` 을 쓰세요.
    open: false,
  },
});

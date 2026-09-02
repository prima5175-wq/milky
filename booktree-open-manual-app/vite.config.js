import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages 는 https://<계정>.github.io/<레포이름>/ 하위에서 서비스되므로
// 에셋 경로 앞에 레포 이름이 붙어야 해요. Actions 워크플로에서만 이 값을 넘깁니다.
// Vercel·Netlify 처럼 루트(/)로 서비스되는 곳에서는 그대로 '/' 를 씁니다.
const base = process.env.VITE_BASE || '/';

export default defineConfig({
  base,
  plugins: [react()],
  server: {
    port: 5173,
    // open: true 는 브라우저가 없는 환경(WSL·컨테이너·CI)에서 오류를 냅니다.
    // 자동으로 열고 싶으면 `npm run dev -- --open` 을 쓰세요.
    open: false,
  },
});

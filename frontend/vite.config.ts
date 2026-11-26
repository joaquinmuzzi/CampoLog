/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Modo demo (npm run build:demo / dev:demo): la API corre en el navegador con los servicios del backend
  // (src/demo/servidor.ts) y se publica en GitHub Pages, en https://joaquinmuzzi.github.io/CampoLog/.
  const demo = mode === 'demo';
  return {
    plugins: [react()],
    base: demo ? '/CampoLog/' : '/',
    define: demo ? { 'import.meta.env.VITE_DEMO': JSON.stringify('true') } : {},
    resolve: {
      alias: {
        '@campolog/demo': demo ? '/src/demo/servidor.ts' : '/src/demo/apagado.ts',
        // Solo los usa el código del backend cuando corre dentro de la demo (en Node se usan los paquetes reales).
        ...(demo ? { jsonwebtoken: '/src/demo/shims/jsonwebtoken.ts', bcryptjs: '/src/demo/shims/bcryptjs.ts' } : {}),
      },
    },
    // En desarrollo, /api va al backend local (así no hace falta CORS). En producción se usa VITE_API_URL.
    // fs.allow deja que la demo use el código de backend/src también con `npm run dev:demo`.
    server: { port: 5173, proxy: demo ? undefined : { '/api': 'http://localhost:3000' }, fs: { allow: ['..'] } },
    test: {
      environment: 'jsdom',
      include: ['src/**/*.test.{ts,tsx}'],
    },
  };
});

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// The SayPay intent model (ml/, port 8000) is reached through this server at
// /saypay-api, so one Cloudflare tunnel to port 5173 serves both the app and
// the model, over https, with no CORS or mixed-content problems.
const intentProxy = {
  '/saypay-api': {
    target: process.env.SAYPAY_API_TARGET || 'http://127.0.0.1:8000',
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/saypay-api/, ''),
  },
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: intentProxy,
    // Allow Cloudflare quick-tunnel links (https://<random>.trycloudflare.com).
    allowedHosts: ['.trycloudflare.com'],
  },
  preview: {
    proxy: intentProxy,
    allowedHosts: ['.trycloudflare.com'],
  },
});

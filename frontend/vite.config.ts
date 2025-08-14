///<reference types="vitest" /> 
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from "path"
import tailwindcss from "@tailwindcss/vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), tailwindcss()],
  server: {
    host: '0.0.0.0', 
    port: 5173,
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      'frontend-e2tf.onrender.com',
      '.onrender.com'
    ],
    proxy: {
      '/api': process.env.NODE_ENV === 'production' 
        ? 'https://api-gateway-latest-d2sg.onrender.com' 
        : 'http://localhost:3001', 
    }
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    }
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: './frontend/src/test/setup.ts'
  }
})

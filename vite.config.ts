/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import pkg from './package.json' with { type: 'json' }

export default defineConfig({
  plugins: [react(), tailwindcss()],
  clearScreen: false,
  server: { port: 1420, strictPort: true },
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  test: { environment: 'node', setupFiles: ['./src/test/setup.ts'] },
})

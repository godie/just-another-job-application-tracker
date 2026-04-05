/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

const apiProxyTarget = process.env.VITE_API_PROXY_TARGET || 'http://localhost:8080'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['jajat-logo.png', 'vite.svg'],
      manifest: {
        name: 'JAJAT - Job Application Tracker',
        short_name: 'JAJAT',
        description: 'Track and manage your job applications with timeline views, calendar, and Google Sheets sync.',
        theme_color: '#4f46e5',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/jajat-logo.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/jajat-logo.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: '/index.html',
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        format: 'es',
      },
    },
    // Use modern target to avoid eval in production
    target: 'es2015',
    // Source maps can cause CSP issues with eval, disable for production
    sourcemap: false,
    // Use esbuild (default) which doesn't use eval
    minify: 'esbuild',
  },
  test: {
    globals: true, // Allows using functions like 'describe', 'it', 'expect' globally
    environment: 'happy-dom', // Using happy-dom instead of jsdom to avoid DONT_CONTEXTIFY error
    setupFiles: './src/setupTests.ts', // File to set up testing library extensions
    // Specify where tests are located
    include: ['**/*.test.{ts,tsx}'],
  },
  server: {
    proxy: {
      '/api': {
          target: apiProxyTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, '/api'),
      },
    },
  },
})

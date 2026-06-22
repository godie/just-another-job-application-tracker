/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

const apiProxyTarget = process.env.VITE_API_PROXY_TARGET || 'http://localhost:8080'

const securityHeaders = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://accounts.google.com https://oauth2.googleapis.com https://www.googleapis.com; frame-ancestors 'none';",
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
}

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
        description: 'Track and manage your job applications with timeline views, calendar integration, and Google Sheets sync. Stay organized throughout your job search journey.',
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
    {
      name: 'security-headers',
      apply: 'serve',
      configureServer(server: { middlewares: { use: (fn: (req: unknown, res: { setHeader: (key: string, value: string) => void }, next: () => void) => void) => void } }) {
        server.middlewares.use((_req: unknown, res: { setHeader: (key: string, value: string) => void }, next: () => void) => {
          Object.entries(securityHeaders).forEach(([key, value]) => {
            res.setHeader(key, value)
          })
          next()
        })
      },
    },
  ],
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        format: 'es',
        generatedCode: {
          constBindings: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
        manualChunks(id) {
          // Split vendor libraries into separate cacheable chunks
          if (id.includes('node_modules')) {
            if (id.includes('recharts')) return 'recharts';
            if (id.includes('react-dom')) return 'react';
            if (id.includes('/react/')) return 'react';
            // scheduler is a dependency of react-dom; keep it in the react chunk
            // to avoid circular chunk dependencies (react -> vendor -> react).
            if (id.includes('scheduler')) return 'react';
            if (id.includes('i18next') || id.includes('react-i18next')) return 'i18n';
            if (id.includes('@react-oauth')) return 'google-auth';
            if (id.includes('@googleapis')) return 'google-sheets';
            if (id.includes('react-icons')) return 'react-icons';
            if (id.includes('zustand')) return 'vendor';
            if (id.includes('dompurify')) return 'vendor';
            return 'vendor';
          }
        },
      },
    },
    target: 'es2015',
    sourcemap: false,
    minify: 'esbuild',
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: './src/setupTests.ts',
    include: ['**/*.test.{ts,tsx}'],
    // Vitest 4 defaults to forks pool, but thread crashes occur in this environment.
    // Explicitly use forks to avoid "Worker exited unexpectedly" errors.
    pool: 'forks',
  },
  server: {
    proxy: {
      '/api': {
          target: apiProxyTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, '/api'),
      },
    },
    headers: {
      // Allow Google OAuth popup to check window.closed without COOP errors.
      // 'same-origin-allow-popups' is the recommended value for OAuth popups.
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    },
  },
})
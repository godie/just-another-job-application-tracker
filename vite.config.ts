/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import crypto from 'node:crypto'

/**
 * v2.6.35 CSP nonce plugin.
 *
 * Generates a per-build (production) or per-request (dev) nonce, then:
 *   1. Adds `data-csp-nonce="<value>"` to `<html>` so runtime code
 *      (`SEOManager.ts`) can read it and add it to dynamically-injected
 *      inline scripts (e.g. JSON-LD).
 *   2. Replaces `'unsafe-inline'` in the meta tag's `script-src` with
 *      `'nonce-<value>'`, removing the loose source for production.
 *   3. Adds `nonce="<value>"` to the 2 static inline scripts in
 *      `index.html` (theme-pre-mount IIFE + Speculation Rules JSON).
 *
 * Why this exists: the runtime JSON-LD injection in `SEOManager.ts`
 * (`upsertJsonLd`) is page-specific and cannot be pre-hashed. Without
 * `'unsafe-inline'` AND without a nonce, the JSON-LD scripts would be
 * blocked by CSP. A nonce is the only W3C-compliant way to allow
 * dynamic inline scripts without loosening the policy.
 *
 * Per-build in production (the hook runs once during `vite build`,
 * the nonce is baked into the static HTML). Per-request in dev
 * (the hook runs on every page load, the nonce rotates on every
 * request — defense against nonce-reuse attacks).
 *
 * The dev server's CSP (set by the `security-headers` plugin below)
 * still uses `'unsafe-inline'` because Vite HMR + React Refresh
 * inject inline scripts that change on every dev save and cannot
 * be nonced. The nonce flow is only for the meta tag (production
 * primary CSP); the dev server's HTTP header CSP keeps `'unsafe-inline'`
 * for HMR compatibility.
 */
function cspNoncePlugin(): import('vite').Plugin {
  return {
    name: 'csp-nonce',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        const nonce = crypto.randomBytes(16).toString('base64')

        // 1. Add nonce to <html> as data-csp-nonce (so runtime can read it).
        //    Inject right after `<html ` so the attribute is on the same
        //    line as the existing lang="en" attribute.
        let updated = html.replace(
          /<html /,
          `<html data-csp-nonce="${nonce}" `,
        )

        // 2. Replace 'unsafe-inline' in the meta tag's script-src with the
        //    nonce. The meta tag's script-src value is parsed as a single
        //    regex match on the full content attribute, then the
        //    script-src portion is rewritten to swap 'unsafe-inline' for
        //    'nonce-<value>'. Other directives are preserved verbatim.
        updated = updated.replace(
          /<meta http-equiv="Content-Security-Policy" content="([^"]*)"/,
          (_match, content) => {
            const newContent = content.replace(
              /(script-src )([^;]+)/,
              (_scriptMatch: string, prefix: string, sources: string) => {
                // Replace 'unsafe-inline' with 'nonce-<value>' in the
                // script-src source list. Other sources (e.g. 'self',
                // https://accounts.google.com) are preserved.
                const newSources = sources.replace(
                  /'unsafe-inline'/,
                  `'nonce-${nonce}'`,
                )
                return prefix + newSources
              },
            )
            return `<meta http-equiv="Content-Security-Policy" content="${newContent}"`
          },
        )

        // 3. Add nonce to the 2 static inline scripts. Two regex passes
        //    because the Speculation Rules script has a type= attribute
        //    (which would not match the bare `<script>` regex).
        updated = updated.replace(
          /<script>/g,
          `<script nonce="${nonce}">`,
        )
        updated = updated.replace(
          /<script type="speculationrules">/g,
          `<script type="speculationrules" nonce="${nonce}">`,
        )

        return updated
      },
    },
  }
}

const apiProxyTarget = process.env.VITE_API_PROXY_TARGET || 'http://localhost:8080'

const securityHeaders = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' https://accounts.google.com https://*.gstatic.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://accounts.google.com https://oauth2.googleapis.com https://www.googleapis.com https://gmail.googleapis.com https://generativelanguage.googleapis.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'; frame-src https://accounts.google.com; worker-src 'self'; manifest-src 'self';",
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
}

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  plugins: [
    cspNoncePlugin(),
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // PWA icon set: WebP first (universal support, ~70% smaller than PNG),
      // AVIF as a secondary choice for launchers that prefer it (~30% smaller
      // than WebP). Workbox precaches both via `includeAssets`; the browser
      // picks the first entry it understands from `manifest.icons`. Files
      // themselves live under `public/` and are emitted as `/<name>.<ext>`.
      //
      // includeAssets explicitly lists every WebP/AVIF we reference anywhere
      // (manifest.icons, index.html <link rel="icon">, Header.tsx <picture>,
      // AuthForm.tsx <picture>). The `globPatterns` extension below (webp/avif)
      // means any future WebP/AVIF added to public/ will also precache; these
      // entries are the explicit "must cache even if globPatterns changes"
      // pin list.
      includeAssets: [
        'favicon-64.webp',
        'favicon-64.avif',
        'icon-192.webp',
        'icon-512.webp',
        'icon-512.avif',
        'icon-192.avif',
        'avatar-80.webp',
        'avatar-80.avif',
      ],
      manifest: {
        name: 'JAJAT - Job Application Tracker',
        short_name: 'JAJAT',
        description: 'Track and manage your job applications with timeline views, calendar integration, and Google Sheets sync. Stay organized throughout your job search journey.',
        theme_color: '#4f46e5',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        // WebP-only manifest icons: spec-stable across all launchers
        // (PNG/SVG/WebP). AVIF is reserved for runtime <picture> sources where
        // browser format negotiation is more permissive.
        icons: [
          { src: '/icon-192.webp', sizes: '192x192', type: 'image/webp', purpose: 'any' },
          { src: '/icon-512.webp', sizes: '512x512', type: 'image/webp', purpose: 'any maskable' },
        ],
      },
      workbox: {
        // webp/avif added so any future asset under public/ that uses those
        // formats precaches without manual registration in includeAssets.
        globPatterns: ['**/*.{js,css,html,ico,png,webp,avif,woff2}'],
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
        // Avoid using eval in output to prevent CSP issues
        format: 'es',
        generatedCode: {
          constBindings: true,
        },
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // React core: react + react-dom + scheduler only. The previous
            // broad `/react/` substring match also caught `/lucide-react/`
            // and `/@radix-ui/react-*/`, dumping non-core packages into the
            // `react` chunk and producing the `vendor -> react -> vendor`
            // circular chunk warning. Restrict to actual core paths.
            if (
              id.includes('/node_modules/react/') ||
              id.includes('/node_modules/react-dom/') ||
              id.includes('/node_modules/scheduler/')
            ) return 'react';
            if (id.includes('recharts')) return 'recharts';
            if (id.includes('i18next') || id.includes('react-i18next')) return 'i18n';
            if (id.includes('@react-oauth')) return 'google-auth';
            if (id.includes('@googleapis')) return 'google-sheets';
            // Radix UI primitives get their own chunk. They transitively
            // depend on @radix-ui/* sub-packages that don't carry the
            // `react-` substring and would otherwise fall through to the
            // `vendor` fallback — bundling them with the rest of their
            // widget family avoids back-and-forth cross-chunk imports.
            if (id.match(/\/node_modules\/@radix-ui\/react-/)) return 'radix-ui';
            // Icons (react-icons + lucide-react) share a chunk so the
            // icon tree-shaking happens once per bundle load instead of
            // pulling Lucide into the `react` core chunk.
            if (id.includes('react-icons') || id.includes('lucide-react')) return 'react-icons';
            if (id.includes('zustand')) return 'vendor';
            if (id.includes('dompurify')) return 'vendor';
            return 'vendor';
          }
        },
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
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    },
  },
})
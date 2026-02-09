/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { resolve } from 'path'
import { copyFileSync, mkdirSync, existsSync } from 'fs'

const isExtensionBuild = process.env.BUILD_EXTENSION === 'true'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // PWA: manifest + service worker (only for web app build, not extension)
    ...(isExtensionBuild
      ? []
      : [
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
        ]),
    // Plugin to copy extension files after build
    {
      name: 'copy-extension-files',
      closeBundle() {
        if (process.env.BUILD_EXTENSION === 'true') {
          const distDir = resolve(__dirname, 'chrome-extension/dist');
          if (!existsSync(distDir)) {
            mkdirSync(distDir, { recursive: true });
          }
          
          // Copy manifest.json
          copyFileSync(
            resolve(__dirname, 'chrome-extension/manifest.json'),
            resolve(distDir, 'manifest.json')
          );
          
          // Copy popup.html
          copyFileSync(
            resolve(__dirname, 'chrome-extension/popup.html'),
            resolve(distDir, 'popup.html')
          );
          
          // Copy icons if they exist (create placeholder if not)
          const iconSizes = [16, 48, 128];
          iconSizes.forEach(size => {
            const iconPath = resolve(__dirname, `chrome-extension/icon${size}.png`);
            if (existsSync(iconPath)) {
              copyFileSync(iconPath, resolve(distDir, `icon${size}.png`));
            }
          });
        }
      }
    }
  ],
  build: {
    outDir: process.env.BUILD_EXTENSION === 'true' ? 'chrome-extension/dist' : 'dist',
    rollupOptions: process.env.BUILD_EXTENSION === 'true' ? {
      input: {
        popup: resolve(__dirname, 'chrome-extension/popup.tsx'),
        content: resolve(__dirname, 'chrome-extension/content.ts'),
        'webapp-content': resolve(__dirname, 'chrome-extension/webapp-content.ts'),
        background: resolve(__dirname, 'chrome-extension/background.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]',
        // Avoid using eval in output to prevent CSP issues
        format: 'es',
        generatedCode: {
          constBindings: true,
        },
      },
    } : {
      output: {
        // Avoid using eval in output to prevent CSP issues
        format: 'es',
        generatedCode: {
          constBindings: true,
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
  },
  server: {
    proxy: {
      '/api': {
          target: 'http://localhost:8000',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, '/api'),
      },
    },
  },
})

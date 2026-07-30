import { execSync } from 'node:child_process'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// Lets Settings show which build is actually live — the deployed bundle's
// filename hash changes on every build regardless of what changed, so
// there was no way to visually confirm from the phone whether a push had
// actually reached production without asking someone to check the source.
function getCommitHash(): string {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim()
  } catch {
    return 'dev'
  }
}

// https://vite.dev/config/
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(getCommitHash()),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icons/apple-touch-icon.png'],
      manifest: {
        name: 'Digitalizador de Tickets',
        short_name: 'Tickets',
        description: 'Digitaliza tickets y facturas para tu contabilidad de autónomo.',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        background_color: '#ffffff',
        theme_color: '#166159',
        categories: ['business', 'finance'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Google API calls are handled by the app-level IndexedDB sync
        // queue, not the service worker cache — never intercept them.
        navigateFallbackDenylist: [/^\/api\//],
        // The OCR engine (worker/core wasm) is multi-MB and must only be
        // fetched lazily on first scan via the CacheFirst rule below, never
        // bundled into the install-time app shell precache.
        globIgnores: ['tesseract/**'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.origin === 'https://www.googleapis.com',
            handler: 'NetworkOnly',
          },
          {
            urlPattern: ({ url }) =>
              url.origin.includes('unpkg.com') || /tessdata|tesseract/i.test(url.pathname),
            handler: 'CacheFirst',
            options: {
              cacheName: 'ocr-engine-cache',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Same lazy-load treatment for the PDF.js worker (~1.2MB) used
            // when reading digital invoices — fetched on first PDF, cached
            // forever after.
            urlPattern: ({ url }) => /pdf\.worker/i.test(url.pathname),
            handler: 'CacheFirst',
            options: {
              cacheName: 'pdf-engine-cache',
              expiration: { maxEntries: 5, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
})

import path from 'node:path'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** Injected into the service worker (must match pose-cache-manifest.json). */
function readPoseModelCacheName(): string {
  try {
    const raw = readFileSync(
      path.join(__dirname, 'public/models/pose/pose-cache-manifest.json'),
      'utf8',
    )
    const name = (JSON.parse(raw) as { cacheName?: string }).cacheName
    return typeof name === 'string' && name.length > 0 ? name : 'pushup-pros-pose-model-v1'
  } catch {
    return 'pushup-pros-pose-model-v1'
  }
}

const poseModelCacheName = readPoseModelCacheName()

// https://vite.dev/config/
export default defineConfig({
  define: {
    __POSE_MODEL_CACHE_NAME__: JSON.stringify(poseModelCacheName),
  },
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      injectRegister: false,
      manifest: {
        name: 'PushupPros',
        short_name: 'PushupPros',
        description: 'Social pushup challenges',
        theme_color: '#0d0d0f',
        background_color: '#0d0d0f',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/pwa-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/apple-touch-icon.png',
            sizes: '180x180',
            type: 'image/png',
          },
          {
            src: '/favicon.svg',
            type: 'image/svg+xml',
            sizes: 'any',
            purpose: 'any',
          },
        ],
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        globIgnores: ['**/models/pose/**/*'],
      },
      /**
       * Needed for HTTPS dev via Cloudflare tunnel (Chrome DevTools shows “No manifest detected” when false):
       * the plugin skips manifest + injection during `vite` otherwise.
       */
      devOptions: {
        enabled: true,
      },
    }),
  ],
  resolve: {
    alias: {
      // Real @mediapipe/pose is UMD-only; TF pose-detection only needs this for BlazePose.
      '@mediapipe/pose': path.resolve(__dirname, 'src/shims/mediapipe-pose.ts'),
    },
  },
  server: {
    port: 5174,
    strictPort: true,
    allowedHosts: [
      'reservoir-techno-directly-pierre.trycloudflare.com'
    ]
  },
})

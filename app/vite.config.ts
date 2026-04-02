import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Real @mediapipe/pose is UMD-only; TF pose-detection only needs this for BlazePose.
      '@mediapipe/pose': path.resolve(__dirname, 'src/shims/mediapipe-pose.ts'),
    },
  },
  server: {
    port: 5174,
    strictPort: true,
  },
})

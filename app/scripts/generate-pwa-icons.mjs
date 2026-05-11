/**
 * Rasterize public/favicon.svg to PWA-required PNG sizes.
 * npm run generate-pwa-icons (from Xershare.Pushup/app)
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

const src = path.join(ROOT, 'public', 'favicon.svg')

async function out(name, size) {
  await sharp(src).resize(size, size, { fit: 'contain' }).png().toFile(path.join(ROOT, 'public', name))
  process.stderr.write(`Wrote public/${name} (${size}×${size})\n`)
}

async function main() {
  await out('pwa-192.png', 192)
  await out('pwa-512.png', 512)
  await out('apple-touch-icon.png', 180)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

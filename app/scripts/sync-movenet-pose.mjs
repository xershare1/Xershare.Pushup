/**
 * Downloads TF Hub MoveNet Lightning (single pose) tfjs-format files into app/public/models/pose/.
 * Run from Xershare.Pushup/app: npm run sync-pose-model
 */
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const MODEL_SEGMENT = 'movenet-lightning-v4'
const OUT_DIR = path.join(ROOT, 'public', 'models', 'pose', MODEL_SEGMENT)

/** TF Hub model base (tfjs-format=file shards live next to model.json). */
const HUB_BASE =
  'https://tfhub.dev/google/tfjs-model/movenet/singlepose/lightning/4/'
const QUERY = '?tfjs-format=file'

async function fetchBinary(url) {
  const res = await fetch(url, { redirect: 'follow' })
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`)
  return new Uint8Array(await res.arrayBuffer())
}

async function fetchJson(url) {
  const res = await fetch(url, { redirect: 'follow' })
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`)
  return res.json()
}

/**
 * Normalize a weightsManifest path to a safe relative POSIX-style path.
 * Returns null if the value cannot be used (absolute, .., URL-like, etc.).
 */
function normalizeManifestRel(rel) {
  if (typeof rel !== 'string') return null
  const s = rel.trim()
  if (!s || s.includes('://') || s.includes('\0')) return null
  if (/^[a-zA-Z]:/.test(s) || s.startsWith('//')) return null
  const parts = s.split(/[/\\]+/).filter(Boolean)
  const out = []
  for (const part of parts) {
    if (part === '..') return null
    if (part === '.') continue
    out.push(part)
  }
  if (!out.length) return null
  return out.join('/')
}

function assertResolvedUnderOutDir(normalizedRel) {
  const resolved = path.resolve(OUT_DIR, normalizedRel)
  const base = path.resolve(OUT_DIR)
  const relToBase = path.relative(base, resolved)
  if (relToBase.startsWith('..') || path.isAbsolute(relToBase)) {
    throw new Error(`weightsManifest path escapes output directory: ${JSON.stringify(normalizedRel)}`)
  }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })

  const modelUrl = `${HUB_BASE}model.json${QUERY}`
  const raw = await fetchJson(modelUrl)
  await writeFile(path.join(OUT_DIR, 'model.json'), `${JSON.stringify(raw, null, 2)}\n`, 'utf8')

  const manifests = raw.weightsManifest
  if (!Array.isArray(manifests)) {
    throw new Error('Unexpected model.json: missing weightsManifest array')
  }

  const relPaths = new Set()
  for (const entry of manifests) {
    if (!entry || !Array.isArray(entry.paths)) continue
    for (const p of entry.paths) {
      if (typeof p !== 'string' || !p.trim()) continue
      const norm = normalizeManifestRel(p)
      if (!norm) {
        throw new Error(`Invalid weightsManifest path: ${JSON.stringify(p)}`)
      }
      assertResolvedUnderOutDir(norm)
      relPaths.add(norm)
    }
  }

  for (const rel of [...relPaths].sort()) {
    const shardUrl = `${HUB_BASE}${rel}${QUERY}`
    const buf = await fetchBinary(shardUrl)
    const target = path.join(OUT_DIR, rel)
    await mkdir(path.dirname(target), { recursive: true })
    await writeFile(target, buf)
    process.stderr.write(`Wrote ${path.relative(ROOT, target)} (${buf.byteLength} bytes)\n`)
  }

  const basePath = `/models/pose/${MODEL_SEGMENT}/`
  const urls = ['/models/pose/pose-cache-manifest.json', `${basePath}model.json`]
  for (const rel of [...relPaths].sort()) {
    urls.push(`${basePath}${rel}`)
  }

  const manifest = {
    cacheName: 'pushup-pros-pose-model-v1',
    urls,
  }

  const manifestPath = path.join(ROOT, 'public', 'models', 'pose', 'pose-cache-manifest.json')
  await mkdir(path.dirname(manifestPath), { recursive: true })
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
  process.stderr.write(`Wrote ${path.relative(ROOT, manifestPath)}\n`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

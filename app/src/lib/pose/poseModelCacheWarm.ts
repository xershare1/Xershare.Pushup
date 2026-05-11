type PoseCacheManifest = {
  cacheName: string
  urls: string[]
}

let manifestPromise: Promise<PoseCacheManifest | null> | null = null
let warmQueued = false
let warmerRunning = false

function loadPoseCacheManifest(): Promise<PoseCacheManifest | null> {
  if (!manifestPromise) {
    manifestPromise = (async (): Promise<PoseCacheManifest | null> => {
      try {
        const res = await fetch('/models/pose/pose-cache-manifest.json', {
          credentials: 'same-origin',
          cache: 'no-cache',
        })
        if (!res.ok) return null
        const data = (await res.json()) as PoseCacheManifest
        return typeof data.cacheName === 'string' && Array.isArray(data.urls) ? data : null
      } catch {
        return null
      }
    })()
  }
  return manifestPromise
}

/**
 * Pre-populate the pose model Cache Storage bucket via background GETs (best-effort).
 * Safe to call from multiple routes; debounced to a single run per page load.
 */
export function schedulePoseModelCacheWarm(): void {
  if (typeof window === 'undefined' || warmQueued) return
  warmQueued = true

  const run = () => {
    void warmPoseModelAssetsOnce()
  }

  const ric = window.requestIdleCallback?.bind(window)
  if (ric) {
    ric(run, { timeout: 5000 })
  } else {
    window.setTimeout(run, 1500)
  }
}

async function warmPoseModelAssetsOnce(): Promise<void> {
  if (warmerRunning) return
  warmerRunning = true
  try {
    const manifest = await loadPoseCacheManifest()
    if (!manifest) return
    await Promise.allSettled(
      manifest.urls.map((path) =>
        fetch(path, { credentials: 'same-origin', mode: 'cors', cache: 'default' }),
      ),
    )
  } finally {
    warmerRunning = false
  }
}

/**
 * True if the current versioned pose cache already has the model.json entry.
 */
export async function probePoseModelCachePrimed(): Promise<boolean> {
  try {
    const manifest = await loadPoseCacheManifest()
    if (!manifest) return false
    const modelUrl = manifest.urls.find((u) => u.endsWith('/model.json'))
    if (!modelUrl) return false
    const cache = await caches.open(manifest.cacheName)
    const hit = await cache.match(new URL(modelUrl, window.location.origin).toString())
    return !!hit
  } catch {
    return false
  }
}

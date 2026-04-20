import type { PushupRepFrameDebug } from './pushupRepTracking'

/** One row per pose callback while lab “Record debug log” is on (or future live export). */
export type PushupDebugExportFrame = {
  i: number
  tSec: number
  poseScore: number
  repAdded: boolean
  repCount: number
  /** Rep tracker state after this frame: null means no stable up/down yet (or reset by non-plank). */
  lastStable: 'up' | 'down' | null
  debug: PushupRepFrameDebug | null
}

export type PushupDebugExport = {
  exportedAt: string
  sourceFileName: string | null
  videoDurationSec: number | null
  frameCount: number
  frames: PushupDebugExportFrame[]
}

/**
 * Triggers a browser download of a JSON file (user picks save location via native dialog).
 */
export function downloadPushupDebugExport(
  data: PushupDebugExport,
  filenameBase = 'pushup-algorithm-debug',
): void {
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const ts = new Date().toISOString().replace(/[:.]/g, '-')
  a.href = url
  a.download = `${filenameBase}-${ts}.json`
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

import type { PushupAlgorithmConfig } from './pushupAlgorithmConfig'
import type { PushupRepFrameDebug } from './pushupRepTracking'

export type PushupDebugExportFrame = {
  i: number
  tSec: number
  poseScore: number
  repAdded: boolean
  repCount: number
  lastStable: 'up' | 'down' | null
  debug: PushupRepFrameDebug | null
}

export type PushupDebugRepEvent = {
  frameIndex: number
  tSec: number
  repCountAfter: number
}

export type PushupDebugExport = {
  exportedAt: string
  sourceFileName: string | null
  videoDurationSec: number | null
  frameCount: number
  algorithmConfig: PushupAlgorithmConfig
  expectedReps: number | null
  finalRepCount: number
  repEvents: PushupDebugRepEvent[]
  frames: PushupDebugExportFrame[]
}

function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function buildPushupDebugExport(params: {
  sourceFileName: string | null
  videoDurationSec: number | null
  frames: PushupDebugExportFrame[]
  algorithmConfig: PushupAlgorithmConfig
  expectedReps: number | null
}): PushupDebugExport {
  const repEvents: PushupDebugRepEvent[] = []
  for (const row of params.frames) {
    if (row.repAdded) {
      repEvents.push({
        frameIndex: row.i,
        tSec: row.tSec,
        repCountAfter: row.repCount,
      })
    }
  }
  const finalRepCount = params.frames.length
    ? params.frames[params.frames.length - 1]!.repCount
    : 0

  return {
    exportedAt: new Date().toISOString(),
    sourceFileName: params.sourceFileName,
    videoDurationSec: params.videoDurationSec,
    frameCount: params.frames.length,
    algorithmConfig: params.algorithmConfig,
    expectedReps: params.expectedReps,
    finalRepCount,
    repEvents,
    frames: params.frames,
  }
}

export function downloadPushupDebugExport(
  data: PushupDebugExport,
  filenameBase = 'pushup-algorithm-debug',
): void {
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' })
  const ts = new Date().toISOString().replace(/[:.]/g, '-')
  triggerBlobDownload(blob, `${filenameBase}-${ts}.json`)
}

function csvEscape(value: string | number | boolean | null | undefined): string {
  if (value == null) return ''
  const s = String(value)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export function pushupDebugExportToCsv(data: PushupDebugExport): string {
  const header = [
    'i',
    'tSec',
    'repCount',
    'repAdded',
    'direction',
    'elbowDeg',
    'validatedPosition',
    'backStraight',
    'rawUp',
    'rawDown',
    'legsExtended',
    'poseScore',
    'motion01',
  ].join(',')

  const rows = data.frames.map((row) => {
    const d = row.debug
    return [
      row.i,
      row.tSec,
      row.repCount,
      row.repAdded,
      d?.direction ?? '',
      d?.normalizedElbowDeg ?? '',
      d?.validatedPosition ?? '',
      d?.backStraight ?? '',
      d?.rawUp ?? '',
      d?.rawDown ?? '',
      d?.legsExtended ?? '',
      row.poseScore,
      d?.motion01 ?? '',
    ]
      .map(csvEscape)
      .join(',')
  })

  return [header, ...rows].join('\n')
}

export function downloadPushupDebugCsv(
  data: PushupDebugExport,
  filenameBase = 'pushup-algorithm-debug',
): void {
  const csv = pushupDebugExportToCsv(data)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const ts = new Date().toISOString().replace(/[:.]/g, '-')
  triggerBlobDownload(blob, `${filenameBase}-${ts}.csv`)
}

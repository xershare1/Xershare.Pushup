/**
 * Browser-direct S3 multipart upload for solo session videos + resume via localStorage.
 */

import type { ClerkGetToken } from './client'
import { jsonFetchAuthed } from './client'
import { HttpError } from './httpError'

const STORAGE_SCHEMA = 'solo.mpu.v1'

export type SoloMultipartPersistedPart = {
  partNumber: number
  etag: string
}

type SoloMultipartPersisted = {
  schema: typeof STORAGE_SCHEMA
  sessionId: string
  uploadId: string
  objectKey: string
  chunkSizeBytes: number
  totalBytes: number
  contentType: string
  parts: SoloMultipartPersistedPart[]
}

export type SoloMultipartInitResponse = {
  sessionId: string
  reps: number
  videoUrl: string | null
  uploadId: string | null
  objectKey: string | null
  multipartRecommendedPartBytes: number
  multipartMaxConcurrency: number
}

type PresignPartsResponse = {
  urls: Record<string, string>
}

export function soloMultipartStorageKey(sessionId: string): string {
  return `${STORAGE_SCHEMA}:${sessionId}`
}

export function loadSoloMultipartState(sessionId: string): SoloMultipartPersisted | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(soloMultipartStorageKey(sessionId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as SoloMultipartPersisted
    if (parsed.schema !== STORAGE_SCHEMA || !parsed.uploadId || !parsed.objectKey) return null
    return parsed
  } catch {
    return null
  }
}

export function persistSoloMultipartState(state: SoloMultipartPersisted): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(soloMultipartStorageKey(state.sessionId), JSON.stringify(state))
  } catch {
    /* quota / privacy mode */
  }
}

export function clearSoloMultipartState(sessionId: string): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.removeItem(soloMultipartStorageKey(sessionId))
  } catch {
    /* ignore */
  }
}

function normaliseQuotedEtag(h: string | null): string {
  const t = (h || '').trim()
  if (!t) return ''
  return t.startsWith('"') && t.endsWith('"') ? t.slice(1, -1).trim() : t.replace(/^W\//i, '').trim()
}

const PART_PUT_TIMEOUT_MS = 120_000

function putBlobToS3Part(
  uploadUrl: string,
  blob: Blob,
  onPartProgress?: (loaded: number, total: number) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', uploadUrl)
    xhr.timeout = PART_PUT_TIMEOUT_MS
    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable && onPartProgress) onPartProgress(ev.loaded, ev.total)
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(normaliseQuotedEtag(xhr.getResponseHeader('ETag')))
        return
      }
      reject(new HttpError(xhr.status, xhr.responseText || xhr.statusText || 'Part upload failed.'))
    }
    xhr.onerror = () => reject(new HttpError(0, 'Network error while uploading a part.'))
    xhr.ontimeout = () =>
      reject(new HttpError(0, `Part upload timed out after ${PART_PUT_TIMEOUT_MS}ms`))
    xhr.send(blob)
  })
}

function partSlices(total: number, chunkSizeBytes: number): Array<{ pn: number; start: number; end: number }> {
  const out: Array<{ pn: number; start: number; end: number }> = []
  let start = 0
  let pn = 1
  while (start < total) {
    const end = Math.min(total, start + chunkSizeBytes)
    out.push({ pn, start, end })
    start = end
    pn += 1
  }
  return out
}

async function retrying<T>(
  label: string,
  fn: (attempt: number) => Promise<T>,
  maxAttempts: number,
): Promise<T> {
  let lastErr: unknown
  for (let i = 0; i < maxAttempts; i += 1) {
    try {
      return await fn(i + 1)
    } catch (e) {
      lastErr = e
      if (i < maxAttempts - 1) {
        const backoffMs = 350 * (i + 1)
        console.warn('[solo-mpu] retry', label, {
          attempt: i + 1,
          nextAttemptInMs: backoffMs,
          err: e instanceof Error ? e.message : String(e),
        })
        await new Promise((r) => setTimeout(r, backoffMs))
      } else {
        console.warn('[solo-mpu] gave up', label, {
          attempts: maxAttempts,
          err: e instanceof Error ? e.message : String(e),
        })
      }
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('Multipart part upload failed.')
}

export type SoloMultipartUploadOptions = {
  getToken: ClerkGetToken
  sessionId: string
  blob: Blob
  contentType: string
  reps: number
  recommendedChunkBytes?: number
  maxConcurrency?: number
  onUploadProgress?: (loaded: number, total: number) => void
}

export type SoloMultipartOutcome =
  | { kind: 'assembled' }
  | { kind: 'already_finished'; videoUrl: string; sessionId: string; reps: number }

/**
 * ``multipart/init`` → parallel UploadPart PUTs → ``/solo/session/multipart/complete``.
 * Caller runs ``complete-upload`` afterwards.
 */
export async function soloMultipartUploadToComplete(opts: SoloMultipartUploadOptions): Promise<SoloMultipartOutcome> {
  const {
    getToken,
    sessionId,
    blob,
    contentType,
    reps,
    recommendedChunkBytes = 8 * 1024 * 1024,
    maxConcurrency = 4,
    onUploadProgress,
  } = opts

  const tStart = performance.now()
  console.info('[solo-mpu] init request', { sessionId, totalBytes: blob.size, contentType })

  const initJson = await jsonFetchAuthed<SoloMultipartInitResponse>(getToken, '/solo/session/multipart/init', {
    method: 'POST',
    body: JSON.stringify({
      reps,
      sessionId,
      contentType,
      videoSizeBytes: blob.size,
    }),
  })

  if (initJson.videoUrl != null && initJson.videoUrl.trim()) {
    console.info('[solo-mpu] init returned existing videoUrl (idempotent hit)', { sessionId })
    clearSoloMultipartState(sessionId)
    return {
      kind: 'already_finished',
      videoUrl: initJson.videoUrl,
      sessionId: initJson.sessionId,
      reps: initJson.reps,
    }
  }

  const uploadId = initJson.uploadId || ''
  if (!uploadId) {
    throw new Error('Server did not start a multipart upload.')
  }
  const objectKey = initJson.objectKey || ''
  if (!objectKey) {
    throw new Error('Server did not return multipart object key.')
  }

  const chunkSizeBytes = clampChunkSize(initJson.multipartRecommendedPartBytes || recommendedChunkBytes)
  const concurrencyCap = clampConcurrency(initJson.multipartMaxConcurrency || maxConcurrency)

  const etagByPart = new Map<number, string>()
  const persisted = loadSoloMultipartState(sessionId)
  let resumedPartCount = 0
  if (
    persisted &&
    persisted.uploadId === uploadId &&
    persisted.objectKey === objectKey &&
    persisted.chunkSizeBytes === chunkSizeBytes &&
    persisted.totalBytes === blob.size &&
    persisted.contentType === contentType
  ) {
    for (const p of persisted.parts) etagByPart.set(p.partNumber, p.etag)
    resumedPartCount = etagByPart.size
  } else if (persisted && persisted.uploadId !== uploadId) {
    clearSoloMultipartState(sessionId)
  }

  const layout = partSlices(blob.size, chunkSizeBytes)
  let confirmedBytes = 0
  for (const slice of layout) {
    if (etagByPart.has(slice.pn)) {
      confirmedBytes += slice.end - slice.start
    }
  }

  const inFlightLoads = new Map<number, number>()

  function emitProgress(): void {
    let activeExtra = 0
    for (const [, ld] of inFlightLoads.entries()) activeExtra += ld
    onUploadProgress?.(Math.min(blob.size, confirmedBytes + activeExtra), blob.size)
  }

  emitProgress()

  const pending = layout.filter((s) => !etagByPart.has(s.pn)).map((s) => s.pn)
  console.info('[solo-mpu] init done', {
    sessionId,
    uploadIdTail: uploadId.slice(-8),
    objectKey,
    chunkSizeBytes,
    concurrencyCap,
    totalParts: layout.length,
    pending: pending.length,
    resumedPartCount,
  })

  async function uploadOne(partNumber: number): Promise<void> {
    const slice = layout.find((x) => x.pn === partNumber)
    if (!slice) throw new Error('Invalid part.')
    const partBytes = slice.end - slice.start

    await retrying(
      `part_${partNumber}`,
      async (attempt) => {
        const tPresign = performance.now()
        const pres = await jsonFetchAuthed<PresignPartsResponse>(getToken, '/solo/session/multipart/presign-parts', {
          method: 'POST',
          body: JSON.stringify({
            sessionId,
            uploadId,
            partNumbers: [partNumber],
          }),
        })
        const presignMs = Math.round(performance.now() - tPresign)

        const urlKey = String(partNumber)
        const signed = pres.urls[urlKey]
        if (!signed) {
          throw new HttpError(0, `Server did not return a presigned URL for part ${partNumber}.`)
        }

        const body = blob.slice(slice.start, slice.end)
        inFlightLoads.set(partNumber, 0)
        emitProgress()

        const tPut = performance.now()
        try {
          const etag = await putBlobToS3Part(signed, body, (ld, tl) => {
            inFlightLoads.set(partNumber, ld)
            emitProgress()
            if (ld >= tl) inFlightLoads.delete(partNumber)
          })
          if (!etag) throw new HttpError(0, 'Missing ETag for uploaded part.')

          const putMs = Math.round(performance.now() - tPut)
          etagByPart.set(partNumber, etag)

          confirmedBytes += partBytes

          const nextParts: SoloMultipartPersistedPart[] = [...etagByPart.entries()]
            .sort((a, b) => a[0] - b[0])
            .map(([pn, etagVal]) => ({ partNumber: pn, etag: etagVal }))
          persistSoloMultipartState({
            schema: STORAGE_SCHEMA,
            sessionId,
            uploadId,
            objectKey,
            chunkSizeBytes,
            totalBytes: blob.size,
            contentType,
            parts: nextParts,
          })

          console.debug('[solo-mpu] part ok', {
            partNumber,
            attempt,
            bytes: partBytes,
            presignMs,
            putMs,
            etagTail: etag.slice(-8),
          })

          emitProgress()
        } finally {
          inFlightLoads.delete(partNumber)
          emitProgress()
        }
      },
      4,
    )
  }

  await promisePool(concurrencyCap, pending, uploadOne)

  console.info('[solo-mpu] all parts uploaded; calling multipart/complete', {
    sessionId,
    uploadIdTail: uploadId.slice(-8),
    parts: etagByPart.size,
    totalBytes: blob.size,
    uploadMs: Math.round(performance.now() - tStart),
  })

  const tComplete = performance.now()
  await jsonFetchAuthed<void>(getToken, '/solo/session/multipart/complete', {
    method: 'POST',
    body: JSON.stringify({ sessionId, uploadId }),
  })
  const completeMs = Math.round(performance.now() - tComplete)

  clearSoloMultipartState(sessionId)
  console.info('[solo-mpu] assembled', {
    sessionId,
    parts: etagByPart.size,
    totalBytes: blob.size,
    completeMs,
    totalMpuMs: Math.round(performance.now() - tStart),
  })
  return { kind: 'assembled' }
}

function clampChunkSize(bytes: number): number {
  const minC = 5 * 1024 * 1024
  const maxC = 10 * 1024 * 1024
  let n = Math.floor(bytes || minC)
  if (!Number.isFinite(n) || n <= 0) n = minC
  return Math.min(Math.max(n, minC), maxC)
}

function clampConcurrency(n: number): number {
  const v = Number.isFinite(n) ? Math.floor(n) : 4
  return Math.min(5, Math.max(3, v))
}

async function promisePool<T>(concurrency: number, items: T[], worker: (item: T) => Promise<void>): Promise<void> {
  const nItems = items.length
  if (nItems === 0) return
  const limit = Math.max(1, Math.min(concurrency, nItems))
  let ix = 0

  async function runner(): Promise<void> {
    while (ix < nItems) {
      const curIx = ix
      ix += 1
      await worker(items[curIx] as T)
    }
  }

  await Promise.all(Array.from({ length: limit }, () => runner()))
}

export async function soloAbortMultipartUpload(
  getToken: ClerkGetToken,
  sessionId: string,
  uploadId: string,
): Promise<void> {
  try {
    await jsonFetchAuthed<void>(getToken, '/solo/session/multipart/abort', {
      method: 'POST',
      body: JSON.stringify({ sessionId, uploadId }),
    })
  } catch {
    /* best effort */
  }
  clearSoloMultipartState(sessionId)
}

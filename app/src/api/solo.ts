import { type ClerkGetToken, jsonFetchAuthed } from './client'
import { isMockApiEnabled } from './config'
import { HttpError } from './httpError'
import { soloMultipartUploadToComplete } from './soloMultipartUpload'

export type SoloSessionResponse = {
  sessionId: string
  reps: number
  videoUrl: string | null
}

export type SoloUploadStrategy = 'simple_put' | 'multipart'

export type SoloSessionPrepareResponse = {
  sessionId: string
  reps: number
  videoUrl: string | null
  uploadUrl: string | null
  uploadHeaders: Record<string, string>
  uploadStrategy?: SoloUploadStrategy
  multipartThresholdBytes?: number | null
  multipartRecommendedPartBytes?: number | null
  multipartMaxConcurrency?: number | null
}

export type SoloSessionListItem = {
  sessionId: string
  reps: number
  createdAt: string
  expiresAt: string
  videoUrl: string | null
}

type SoloSessionListOut = {
  sessions: SoloSessionListItem[]
}

function parseFastApiDetail(text: string): string {
  try {
    const j = JSON.parse(text) as { detail?: unknown }
    if (typeof j.detail === 'string') return j.detail
    if (Array.isArray(j.detail) && j.detail[0] && typeof j.detail[0] === 'object') {
      const msg = (j.detail[0] as { msg?: string }).msg
      if (typeof msg === 'string') return msg
    }
  } catch {
    /* ignore */
  }
  return text.trim() || 'Request failed'
}

const STORAGE_ERROR_MSG_MAX = 200

/** Safe message for UI from S3/storage XHR bodies (avoid raw XML/HTML pages). */
function sanitizeStorageErrorMessage(responseText: string, statusText: string): string {
  const fallback = (statusText || '').trim() || 'Upload to storage failed.'
  const raw = (responseText || '').trim()
  if (!raw) return fallback

  try {
    const j = JSON.parse(raw) as Record<string, unknown>
    if (typeof j.message === 'string' && j.message.trim()) {
      return truncateErrorDisplay(j.message.trim(), STORAGE_ERROR_MSG_MAX)
    }
    if (typeof j.detail === 'string' && j.detail.trim()) {
      return truncateErrorDisplay(j.detail.trim(), STORAGE_ERROR_MSG_MAX)
    }
    if (Array.isArray(j.detail) && j.detail[0] && typeof j.detail[0] === 'object') {
      const msg = (j.detail[0] as { msg?: string }).msg
      if (typeof msg === 'string' && msg.trim()) {
        return truncateErrorDisplay(msg.trim(), STORAGE_ERROR_MSG_MAX)
      }
    }
  } catch {
    /* not JSON */
  }

  const noTags = raw.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  if (!noTags) return fallback
  return truncateErrorDisplay(noTags, STORAGE_ERROR_MSG_MAX)
}

function truncateErrorDisplay(s: string, max: number): string {
  const t = stripNonPrintableExceptTab(s).trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}

function stripNonPrintableExceptTab(s: string): string {
  let out = ''
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i)
    if (c === 9 || c >= 32) out += s[i]!
  }
  return out
}

const SIMPLE_PUT_TIMEOUT_MS = 120_000

function putBlobToS3(
  uploadUrl: string,
  blob: Blob,
  headers: Record<string, string>,
  onUploadProgress?: (loaded: number, total: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', uploadUrl)
    xhr.timeout = SIMPLE_PUT_TIMEOUT_MS
    for (const [k, v] of Object.entries(headers)) {
      xhr.setRequestHeader(k, v)
    }
    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable && onUploadProgress) {
        onUploadProgress(ev.loaded, ev.total)
      }
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve()
        return
      }
      const msg = sanitizeStorageErrorMessage(xhr.responseText, xhr.statusText)
      reject(new HttpError(xhr.status, msg))
    }
    xhr.onerror = () => reject(new HttpError(0, 'Network error while uploading to storage.'))
    xhr.onabort = () => reject(new HttpError(0, 'Upload cancelled.'))
    xhr.ontimeout = () =>
      reject(new HttpError(0, `Upload to storage timed out after ${SIMPLE_PUT_TIMEOUT_MS}ms`))
    xhr.send(blob)
  })
}

export type SoloCloudPhase = 'uploading' | 'processing'

export type CreateSoloSessionOptions = {
  onUploadProgress?: (loaded: number, total: number) => void
  onPhaseChange?: (phase: SoloCloudPhase) => void
}

/**
 * Persist a solo set (reps + optional recorded video). Requires Clerk session JWT.
 * Recordings upload via presigned PUT or multipart UploadPart directly to S3, then finalize on the API.
 */
export async function createSoloSession(
  getToken: ClerkGetToken,
  params: { reps: number; video?: Blob | null; sessionId?: string },
  options?: CreateSoloSessionOptions,
): Promise<SoloSessionResponse> {
  if (isMockApiEnabled()) {
    return {
      sessionId: params.sessionId ?? 'mock-session',
      reps: params.reps,
      videoUrl: null,
    }
  }

  const token = (await getToken()) ?? null
  if (!token) {
    throw new Error('Sign in to save your session.')
  }

  const progress = options?.onUploadProgress
  const onPhaseChange = options?.onPhaseChange
  const sessionId = params.sessionId
  if (!sessionId) {
    throw new Error('Missing session id for solo save.')
  }

  const video = params.video
  const hasVideo = Boolean(video && video.size > 0)
  const startedAt = performance.now()
  const videoBytes = hasVideo ? video!.size : 0
  console.info('[solo] createSoloSession start', {
    sessionId,
    reps: params.reps,
    hasVideo,
    videoBytes,
  })

  try {
    if (!hasVideo) {
      console.info('[solo] phase=complete-upload-no-video', { sessionId })
      const out = await jsonFetchAuthed<SoloSessionResponse>(getToken, '/solo/session/complete-upload', {
        method: 'POST',
        body: JSON.stringify({
          sessionId,
          reps: params.reps,
        }),
      })
      console.info('[solo] createSoloSession done', {
        sessionId,
        totalMs: Math.round(performance.now() - startedAt),
        videoBytes: 0,
      })
      return out
    }

    const tPrepare = performance.now()
    console.info('[solo] phase=prepare-upload start', { sessionId, videoBytes })
    const prepared = await jsonFetchAuthed<SoloSessionPrepareResponse>(
      getToken,
      '/solo/session/prepare-upload',
      {
        method: 'POST',
        body: JSON.stringify({
          reps: params.reps,
          sessionId,
          contentType: video!.type || 'video/webm',
          videoSizeBytes: video!.size,
        }),
      },
    )
    console.info('[solo] phase=prepare-upload done', {
      sessionId,
      ms: Math.round(performance.now() - tPrepare),
      strategy: prepared.uploadStrategy,
      idempotentVideoUrl: Boolean(prepared.videoUrl),
    })

    if (prepared.videoUrl) {
      console.info('[solo] createSoloSession done (idempotent prepare hit)', {
        sessionId,
        totalMs: Math.round(performance.now() - startedAt),
      })
      return {
        sessionId: prepared.sessionId,
        reps: prepared.reps,
        videoUrl: prepared.videoUrl,
      }
    }

    const multipart = prepared.uploadStrategy === 'multipart'

    if (multipart) {
      onPhaseChange?.('uploading')
      console.info('[solo] phase=multipart start', { sessionId, videoBytes })
      const tMpu = performance.now()
      const assembled = await soloMultipartUploadToComplete({
        getToken,
        sessionId: prepared.sessionId,
        blob: video!,
        contentType: video!.type || 'video/webm',
        reps: params.reps,
        recommendedChunkBytes: prepared.multipartRecommendedPartBytes ?? undefined,
        maxConcurrency: prepared.multipartMaxConcurrency ?? undefined,
        onUploadProgress: progress,
      })
      console.info('[solo] phase=multipart done', {
        sessionId,
        ms: Math.round(performance.now() - tMpu),
        kind: assembled.kind,
      })

      if (assembled.kind === 'already_finished') {
        console.info('[solo] createSoloSession done (multipart already_finished)', {
          sessionId,
          totalMs: Math.round(performance.now() - startedAt),
        })
        return {
          sessionId: assembled.sessionId,
          reps: assembled.reps,
          videoUrl: assembled.videoUrl,
        }
      }

      onPhaseChange?.('processing')
      console.info('[solo] phase=complete-upload start', { sessionId })
      const tComplete = performance.now()
      const out = await jsonFetchAuthed<SoloSessionResponse>(getToken, '/solo/session/complete-upload', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: prepared.sessionId,
          reps: params.reps,
          contentType: video!.type || 'video/webm',
        }),
      })
      console.info('[solo] phase=complete-upload done', {
        sessionId,
        ms: Math.round(performance.now() - tComplete),
      })
      console.info('[solo] createSoloSession done', {
        sessionId,
        totalMs: Math.round(performance.now() - startedAt),
        videoBytes,
      })
      return out
    }

    const uploadUrl = prepared.uploadUrl
    if (!uploadUrl) {
      throw new Error('Server did not return an upload URL.')
    }

    onPhaseChange?.('uploading')
    console.info('[solo] phase=simple-put start', { sessionId, videoBytes })
    const tPut = performance.now()
    await putBlobToS3(uploadUrl, video!, prepared.uploadHeaders, progress)
    console.info('[solo] phase=simple-put done', {
      sessionId,
      ms: Math.round(performance.now() - tPut),
    })
    onPhaseChange?.('processing')

    console.info('[solo] phase=complete-upload start', { sessionId })
    const tComplete = performance.now()
    const out = await jsonFetchAuthed<SoloSessionResponse>(getToken, '/solo/session/complete-upload', {
      method: 'POST',
      body: JSON.stringify({
        sessionId: prepared.sessionId,
        reps: params.reps,
        contentType: video!.type || 'video/webm',
      }),
    })
    console.info('[solo] phase=complete-upload done', {
      sessionId,
      ms: Math.round(performance.now() - tComplete),
    })
    console.info('[solo] createSoloSession done', {
      sessionId,
      totalMs: Math.round(performance.now() - startedAt),
      videoBytes,
    })
    return out
  } catch (e) {
    console.warn('[solo] createSoloSession error', {
      sessionId,
      totalMs: Math.round(performance.now() - startedAt),
      err: e instanceof Error ? e.message : String(e),
    })
    if (e instanceof HttpError) {
      throw new HttpError(e.status, parseFastApiDetail(e.message))
    }
    throw e
  }
}

/**
 * List non-expired solo sessions (newest first). Playback URLs (CloudFront or S3) when stored.
 */
export async function fetchSoloSessions(getToken: ClerkGetToken): Promise<SoloSessionListItem[]> {
  if (isMockApiEnabled()) {
    const now = Date.now()
    const hour = 60 * 60 * 1000
    const day = 24 * hour
    const in23h = new Date(now + 23 * hour).toISOString()
    const in30h = new Date(now + 30 * hour).toISOString()
    const sampleVideo =
      'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.webm'
    return [
      {
        sessionId: 's1',
        reps: 28,
        createdAt: new Date(now).toISOString(),
        expiresAt: in23h,
        videoUrl: sampleVideo,
      },
      {
        sessionId: 's2',
        reps: 30,
        createdAt: new Date(now - 3 * hour).toISOString(),
        expiresAt: in30h,
        videoUrl: sampleVideo,
      },
      {
        sessionId: 's3',
        reps: 22,
        createdAt: new Date(now - 2 * day).toISOString(),
        expiresAt: new Date(now + 20 * hour).toISOString(),
        videoUrl: null,
      },
      {
        sessionId: 's4',
        reps: 24,
        createdAt: new Date(now - 3 * day).toISOString(),
        expiresAt: new Date(now + 18 * hour).toISOString(),
        videoUrl: null,
      },
    ]
  }

  const token = await getToken()
  if (!token) {
    throw new Error('Sign in to view your videos.')
  }

  try {
    const data = await jsonFetchAuthed<SoloSessionListOut>(getToken, '/solo/sessions')
    return data.sessions
  } catch (e) {
    if (e instanceof HttpError) {
      throw new HttpError(e.status, parseFastApiDetail(e.message))
    }
    throw e
  }
}

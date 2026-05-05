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

function putBlobToS3(
  uploadUrl: string,
  blob: Blob,
  headers: Record<string, string>,
  onUploadProgress?: (loaded: number, total: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', uploadUrl)
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
      const text = xhr.responseText || xhr.statusText
      reject(new HttpError(xhr.status, text || 'Upload to storage failed.'))
    }
    xhr.onerror = () => reject(new HttpError(0, 'Network error while uploading to storage.'))
    xhr.onabort = () => reject(new HttpError(0, 'Upload cancelled.'))
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

  try {
    if (!hasVideo) {
      return await jsonFetchAuthed<SoloSessionResponse>(getToken, '/solo/session/complete-upload', {
        method: 'POST',
        body: JSON.stringify({
          sessionId,
          reps: params.reps,
        }),
      })
    }

    onPhaseChange?.('uploading')

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

    if (prepared.videoUrl) {
      return {
        sessionId: prepared.sessionId,
        reps: prepared.reps,
        videoUrl: prepared.videoUrl,
      }
    }

    const multipart = prepared.uploadStrategy === 'multipart'

    if (multipart) {
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

      if (assembled.kind === 'already_finished') {
        return {
          sessionId: assembled.sessionId,
          reps: assembled.reps,
          videoUrl: assembled.videoUrl,
        }
      }

      onPhaseChange?.('processing')
      return await jsonFetchAuthed<SoloSessionResponse>(getToken, '/solo/session/complete-upload', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: prepared.sessionId,
          reps: params.reps,
          contentType: video!.type || 'video/webm',
        }),
      })
    }

    const uploadUrl = prepared.uploadUrl
    if (!uploadUrl) {
      throw new Error('Server did not return an upload URL.')
    }

    await putBlobToS3(uploadUrl, video!, prepared.uploadHeaders, progress)
    onPhaseChange?.('processing')

    return await jsonFetchAuthed<SoloSessionResponse>(getToken, '/solo/session/complete-upload', {
      method: 'POST',
      body: JSON.stringify({
        sessionId: prepared.sessionId,
        reps: params.reps,
        contentType: video!.type || 'video/webm',
      }),
    })
  } catch (e) {
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

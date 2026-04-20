import { type ClerkGetToken, fetchAuthed, jsonFetchAuthed } from './client'
import { isMockApiEnabled } from './config'
import { HttpError } from './httpError'

export type SoloSessionResponse = {
  sessionId: string
  reps: number
  videoUrl: string | null
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

/**
 * Persist a solo set (reps + optional recorded video). Requires Clerk session JWT.
 * Uses multipart/form-data; do not set Content-Type (browser sets boundary).
 */
export async function createSoloSession(
  getToken: ClerkGetToken,
  params: { reps: number; video?: Blob | null; sessionId?: string },
): Promise<SoloSessionResponse> {
  if (isMockApiEnabled()) {
    return {
      sessionId: params.sessionId ?? 'mock-session',
      reps: params.reps,
      videoUrl: null,
    }
  }

  const token = await getToken()
  if (!token) {
    throw new Error('Sign in to save your session.')
  }

  const form = new FormData()
  form.append('reps', String(params.reps))
  if (params.sessionId) {
    form.append('session_id', params.sessionId)
  }
  if (params.video && params.video.size > 0) {
    const ext = params.video.type.includes('mp4') ? 'mp4' : 'webm'
    form.append('video', params.video, `solo-session.${ext}`)
  }

  const res = await fetchAuthed(getToken, '/solo/session', {
    method: 'POST',
    body: form,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new HttpError(res.status, parseFastApiDetail(text))
  }

  return res.json() as Promise<SoloSessionResponse>
}

/**
 * List non-expired solo sessions (newest first). Presigned video URLs when a recording exists.
 */
export async function fetchSoloSessions(
  getToken: ClerkGetToken,
): Promise<SoloSessionListItem[]> {
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

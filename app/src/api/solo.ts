import { jsonFetch } from './client'
import { getApiBaseUrl, isMockApiEnabled } from './config'
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
  getToken: () => Promise<string | null>,
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

  const base = getApiBaseUrl()
  const form = new FormData()
  form.append('reps', String(params.reps))
  if (params.sessionId) {
    form.append('session_id', params.sessionId)
  }
  if (params.video && params.video.size > 0) {
    const ext = params.video.type.includes('mp4') ? 'mp4' : 'webm'
    form.append('video', params.video, `solo-session.${ext}`)
  }

  const res = await fetch(`${base}/solo/session`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
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
  getToken: () => Promise<string | null>,
): Promise<SoloSessionListItem[]> {
  if (isMockApiEnabled()) {
    const soon = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    return [
      {
        sessionId: 'mock-session-1',
        reps: 12,
        createdAt: new Date().toISOString(),
        expiresAt: soon,
        videoUrl: null,
      },
    ]
  }

  const token = await getToken()
  if (!token) {
    throw new Error('Sign in to view your videos.')
  }

  try {
    const data = await jsonFetch<SoloSessionListOut>('/solo/sessions', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    return data.sessions
  } catch (e) {
    if (e instanceof HttpError) {
      throw new HttpError(e.status, parseFastApiDetail(e.message))
    }
    throw e
  }
}

import { getApiBaseUrl, isMockApiEnabled } from './config'
import { HttpError } from './httpError'

export type SoloSessionResponse = {
  sessionId: string
  reps: number
  videoUrl: string | null
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
  params: { reps: number; video?: Blob | null },
): Promise<SoloSessionResponse> {
  if (isMockApiEnabled()) {
    return {
      sessionId: 'mock-session',
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

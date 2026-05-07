import { getApiBaseUrl } from './config'
import { HttpError } from './httpError'

/** Clerk `useAuth().getToken` — optional `skipCache` forces a fresh JWT after 401. */
export type ClerkGetToken = (
  options?: { skipCache?: boolean },
) => Promise<string | null | undefined>

function mergeHeaders(
  init: RequestInit | undefined,
  defaults: Record<string, string>,
  token: string | null,
): Headers {
  const h = new Headers()
  for (const [k, v] of Object.entries(defaults)) {
    h.set(k, v)
  }
  const extra = init?.headers
  if (extra instanceof Headers) {
    extra.forEach((v, k) => {
      h.set(k, v)
    })
  } else if (Array.isArray(extra)) {
    for (const [k, v] of extra) {
      h.set(k, v)
    }
  } else if (extra && typeof extra === 'object') {
    for (const [k, v] of Object.entries(extra)) {
      if (v !== undefined) h.set(k, String(v))
    }
  }
  if (token) {
    h.set('Authorization', `Bearer ${token}`)
  }
  return h
}

function generateReqId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID().replace(/-/g, '').slice(0, 12)
    }
  } catch {
    /* fall through */
  }
  return Math.random().toString(36).slice(2, 14)
}

/**
 * Per-route hard ceiling. Multipart finalize and DB-write paths get more headroom
 * because they wait on S3 + Postgres; everything else uses 30s so a stalled
 * connection can't hold a per-host slot indefinitely.
 */
function timeoutForPath(path: string): number {
  if (path.includes('/multipart/complete') || path.includes('/complete-upload')) {
    return 60_000
  }
  return 30_000
}

export async function authedFetchOnce(
  getToken: ClerkGetToken,
  path: string,
  init: RequestInit | undefined,
  headerDefaults: Record<string, string>,
): Promise<Response> {
  const base = getApiBaseUrl()
  const reqId = generateReqId()
  const method = (init?.method || 'GET').toUpperCase()
  const timeoutMs = timeoutForPath(path)
  const defaultsWithReq: Record<string, string> = {
    ...headerDefaults,
    'X-Request-Id': reqId,
  }
  const token = (await getToken()) ?? null

  const run = async (t: string | null, attempt: number): Promise<Response> => {
    const controller = new AbortController()
    const timer = window.setTimeout(() => controller.abort(), timeoutMs)
    const startedAt = performance.now()
    console.debug('[api] →', method, path, { reqId, attempt, timeoutMs })
    try {
      const r = await fetch(`${base}${path}`, {
        ...init,
        headers: mergeHeaders(init, defaultsWithReq, t),
        signal: controller.signal,
      })
      const ms = Math.round(performance.now() - startedAt)
      const serverReqId = r.headers.get('x-request-id') || ''
      console.debug('[api] ←', method, path, {
        reqId,
        attempt,
        status: r.status,
        ms,
        serverReqId,
      })
      return r
    } catch (e) {
      const ms = Math.round(performance.now() - startedAt)
      const isAbort = (e as DOMException | null)?.name === 'AbortError'
      if (isAbort) {
        console.warn('[api] ✕ timeout', method, path, { reqId, attempt, timeoutMs, ms })
        throw new HttpError(0, `Request timed out after ${timeoutMs}ms`)
      }
      console.warn('[api] ✕ error', method, path, { reqId, attempt, ms, err: String(e) })
      throw e
    } finally {
      window.clearTimeout(timer)
    }
  }

  let res = await run(token, 1)
  if (res.status === 401 && token) {
    const fresh = (await getToken({ skipCache: true })) ?? null
    if (fresh) {
      res = await run(fresh, 2)
    }
  }
  return res
}

export async function jsonFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const base = getApiBaseUrl()
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })

  if (!res.ok) {
    const text = await res.text()
    throw new HttpError(res.status, text || res.statusText)
  }

  if (res.status === 204) {
    return undefined as T
  }

  return res.json() as Promise<T>
}

/**
 * JSON request with Bearer token; on 401 retries once with `getToken({ skipCache: true })`.
 */
export async function jsonFetchAuthed<T>(
  getToken: ClerkGetToken,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await authedFetchOnce(getToken, path, init, {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  })

  if (!res.ok) {
    const text = await res.text()
    throw new HttpError(res.status, text || res.statusText)
  }

  if (res.status === 204) {
    return undefined as T
  }

  return res.json() as Promise<T>
}

/**
 * Raw fetch with Bearer token; on 401 retries once with a fresh token.
 * Does not set `Content-Type` when `init.body` is `FormData` (browser sets multipart boundary).
 */
export async function fetchAuthed(
  getToken: ClerkGetToken,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const isForm = init?.body instanceof FormData
  const defaults: Record<string, string> = { Accept: 'application/json' }
  if (!isForm) {
    defaults['Content-Type'] = 'application/json'
  }
  return authedFetchOnce(getToken, path, init, defaults)
}

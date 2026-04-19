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

async function authedFetchOnce(
  getToken: ClerkGetToken,
  path: string,
  init: RequestInit | undefined,
  headerDefaults: Record<string, string>,
): Promise<Response> {
  const base = getApiBaseUrl()
  const token = (await getToken()) ?? null
  const run = (t: string | null) =>
    fetch(`${base}${path}`, {
      ...init,
      headers: mergeHeaders(init, headerDefaults, t),
    })

  let res = await run(token)
  if (res.status === 401 && token) {
    const fresh = (await getToken({ skipCache: true })) ?? null
    if (fresh) {
      res = await run(fresh)
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

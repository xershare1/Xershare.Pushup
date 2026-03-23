import { getApiBaseUrl } from './config'
import { HttpError } from './httpError'

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

/** When true, API calls use the in-browser mock (no FastAPI required). */
export function isMockApiEnabled(): boolean {
  return import.meta.env.VITE_USE_MOCK_API === 'true'
}

/**
 * Base URL for the FastAPI service (no trailing slash).
 * Required when `VITE_USE_MOCK_API` is not `true` (validated at request time).
 */
export function getApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_BASE_URL
  if (!raw || !String(raw).trim()) {
    throw new Error(
      'VITE_API_BASE_URL is not set. Add it to .env.development or your deploy environment.',
    )
  }
  return String(raw).replace(/\/$/, '')
}

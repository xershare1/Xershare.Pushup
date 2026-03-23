/**
 * PushupPros product app (`pushuppros-app`) base URL — no trailing slash.
 * Set `VITE_CHALLENGE_APP_URL` per environment (e.g. http://localhost:5174 in dev).
 */
export const CHALLENGE_APP_URL =
  import.meta.env.VITE_CHALLENGE_APP_URL?.trim() ||
  'https://xershare.com/pushup'

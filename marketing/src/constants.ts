/**
 * PushupPros product app (`pushuppros-app`) base URL — no trailing slash.
 * Set `VITE_CHALLENGE_APP_URL` per environment (e.g. http://localhost:5174 in dev).
 */
export const CHALLENGE_APP_URL =
  import.meta.env.VITE_CHALLENGE_APP_URL?.trim() || 'https://app.pushuppros.com'

/**
 * Sign-up / sign-in destinations on the challenge app. Override if your Clerk
 * instance uses different paths or hosted Account Portal URLs.
 */
export const APP_SIGN_UP_URL =
  import.meta.env.VITE_APP_SIGN_UP_URL?.trim() || `${CHALLENGE_APP_URL}/sign-up`

export const APP_SIGN_IN_URL =
  import.meta.env.VITE_APP_SIGN_IN_URL?.trim() || `${CHALLENGE_APP_URL}/sign-in`

export const APP_LEADERBOARD_URL = `${CHALLENGE_APP_URL}/leaderboard`

export const APP_CREDITS_URL = `${CHALLENGE_APP_URL}/credits`

/**
 * Marketing "Open app →" destination. Defaults to the app origin; auth routing
 * (e.g. dashboard vs sign-in) is handled by the app / server.
 */
export const APP_OPEN_URL =
  import.meta.env.VITE_APP_OPEN_URL?.trim() || CHALLENGE_APP_URL

/** Footer Contact link — full mailto URL. */
export const CONTACT_MAILTO =
  import.meta.env.VITE_CONTACT_MAILTO?.trim() || 'mailto:support@pushuppros.com'

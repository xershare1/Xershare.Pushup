import { type ClerkGetToken, jsonFetchAuthed } from './client'
import { isMockApiEnabled } from './config'

export type BundleCode = 'starter' | 'challenger' | 'pro'

/**
 * Authenticated user's credit balance (0 when no ledger row yet).
 */
export async function fetchCreditBalance(
  getToken: ClerkGetToken,
): Promise<number> {
  if (isMockApiEnabled()) {
    return 0
  }
  const token = await getToken()
  if (!token) {
    return 0
  }
  const data = await jsonFetchAuthed<{ balance: number }>(getToken, '/billing/balance')
  return data.balance ?? 0
}

/**
 * Creates a Stripe Checkout Session server-side; returns the hosted checkout URL.
 * Caller must supply Clerk session JWT via getToken().
 */
export async function createCheckoutSession(
  getToken: ClerkGetToken,
  bundleCode: BundleCode,
): Promise<string> {
  const token = await getToken()
  if (!token) {
    throw new Error('Sign in to purchase credits.')
  }
  console.log('bundleCode', bundleCode)
  const data = await jsonFetchAuthed<{ url: string }>(
    getToken,
    '/billing/create-checkout-session',
    {
      method: 'POST',
      body: JSON.stringify({ bundle_code: bundleCode }),
    },
  )
  return data.url
}

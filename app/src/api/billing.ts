import { jsonFetch } from './client'

export type BundleCode = 'starter' | 'challenger' | 'pro'

/**
 * Creates a Stripe Checkout Session server-side; returns the hosted checkout URL.
 * Caller must supply Clerk session JWT via getToken().
 */
export async function createCheckoutSession(
  getToken: () => Promise<string | null>,
  bundleCode: BundleCode,
): Promise<string> {
  const token = await getToken()
  if (!token) {
    throw new Error('Sign in to purchase credits.')
  }
  console.log('bundleCode', bundleCode)
  const data = await jsonFetch<{ url: string }>('/billing/create-checkout-session', {
    method: 'POST',
    body: JSON.stringify({ bundle_code: bundleCode }),
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  return data.url
}

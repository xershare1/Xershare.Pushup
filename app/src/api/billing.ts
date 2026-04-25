import { type ClerkGetToken, jsonFetchAuthed } from './client'
import { isMockApiEnabled } from './config'

export type BundleCode = 'starter' | 'challenger' | 'pro'

export type CreditHistoryItem = {
  id: string
  type: 'earn' | 'spend'
  description: string
  credits: number
  date: string
  amount_paid_usd: number | null
  subline?: string | null
  badge?: 'entry_gifted' | 'auto_refund' | null
}

const MOCK_CREDIT_BALANCE = 30

const MOCK_CREDIT_HISTORY: CreditHistoryItem[] = [
  {
    id: 'h1',
    type: 'spend',
    description: 'Accepted challenge vs repking',
    credits: -1,
    date: '2026-04-19T00:48:00Z',
    amount_paid_usd: null,
  },
  {
    id: 'h2',
    type: 'spend',
    description: 'Accepted challenge vs pushuppro22',
    credits: -1,
    date: '2026-04-18T23:55:00Z',
    amount_paid_usd: null,
  },
  {
    id: 'h3',
    type: 'earn',
    description: 'Purchased Pro pack',
    credits: 15,
    date: '2026-04-18T18:00:00Z',
    amount_paid_usd: 10.0,
  },
  {
    id: 'h4',
    type: 'earn',
    description: 'Welcome bonus',
    credits: 20,
    date: '2026-04-17T10:00:00Z',
    amount_paid_usd: null,
  },
]

/**
 * Authenticated user's credit balance (0 when no ledger row yet).
 */
export async function fetchCreditBalance(
  getToken: ClerkGetToken,
): Promise<number> {
  if (isMockApiEnabled()) {
    return MOCK_CREDIT_BALANCE
  }
  const token = await getToken()
  if (!token) {
    return 0
  }
  const data = await jsonFetchAuthed<{ balance: number }>(getToken, '/billing/balance')
  return data.balance ?? 0
}

/**
 * Credit ledger entries (newest first).
 */
export async function fetchCreditHistory(
  getToken: ClerkGetToken,
): Promise<CreditHistoryItem[]> {
  if (isMockApiEnabled()) {
    return MOCK_CREDIT_HISTORY
  }
  const token = await getToken()
  if (!token) {
    return []
  }
  const data = await jsonFetchAuthed<{ items: CreditHistoryItem[] }>(
    getToken,
    '/billing/history',
  )
  return data.items ?? []
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

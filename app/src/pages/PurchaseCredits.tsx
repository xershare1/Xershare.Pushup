import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@clerk/react'
import { createCheckoutSession, type BundleCode } from '../api/billing'
import { formatError } from '../lib/formatError'

const BUNDLES: {
  code: BundleCode
  label: string
  badge?: string
  credits: number
  price: string
}[] = [
  { code: 'starter', label: 'Starter', credits: 5, price: '$5' },
  {
    code: 'challenger',
    label: 'Most Popular',
    badge: 'Popular',
    credits: 15,
    price: '$10',
  },
  { code: 'pro', label: 'Best Value', credits: 40, price: '$20' },
]

export function PurchaseCredits() {
  const { getToken } = useAuth()
  const [loadingCode, setLoadingCode] = useState<BundleCode | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function onBuy(bundleCode: BundleCode) {
    setError(null)
    setLoadingCode(bundleCode)
    try {
      const url = await createCheckoutSession(getToken, bundleCode)
      window.location.href = url
    } catch (err) {
      setError(formatError(err))
    } finally {
      setLoadingCode(null)
    }
  }

  return (
    <section className="stack purchase-page">
      <h1 className="page-title">Welcome to Pushup Pro</h1>
      <p className="lede">
        Create an account to track your sessions and compete. Choose a credit pack
        to start your first challenge — payment is handled securely by Stripe.
      </p>

      {error ? (
        <p className="banner banner-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="purchase-grid">
        {BUNDLES.map((b) => (
          <div key={b.code} className="card stack purchase-card">
            {b.badge ? (
              <span className="purchase-badge" aria-hidden>
                {b.badge}
              </span>
            ) : null}
            <h2 className="purchase-card-title">{b.label}</h2>
            <p className="purchase-card-meta">
              {b.credits} credits · {b.price}
            </p>
            <button
              type="button"
              className="btn btn-primary"
              disabled={loadingCode !== null}
              onClick={() => onBuy(b.code)}
            >
              {loadingCode === b.code ? 'Redirecting…' : `Buy — ${b.price}`}
            </button>
          </div>
        ))}
      </div>

      <p className="muted" style={{ marginTop: '1.5rem', fontSize: '0.95rem' }}>
        <Link to="/challenge/start">Skip for now</Link> — start a challenge without buying
        credits (you can add credits anytime from the header).
      </p>
    </section>
  )
}

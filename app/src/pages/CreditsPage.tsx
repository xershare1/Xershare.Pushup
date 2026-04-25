import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '@clerk/react'

import {
  createCheckoutSession,
  fetchCreditBalance,
  fetchCreditHistory,
  type BundleCode,
  type CreditHistoryItem,
} from '../api/billing'
import { formatError } from '../lib/formatError'

import './CreditsPage.css'

const PACKS: {
  bundleCode: BundleCode
  name: string
  credits: number
  priceUsd: number
  pricePerCredit: number
  savingsPct: number
  featured: boolean
  perks: string[]
}[] = [
  {
    bundleCode: 'starter',
    name: 'Starter',
    credits: 5,
    priceUsd: 5,
    pricePerCredit: 1,
    savingsPct: 0,
    featured: false,
    perks: ['5 challenge accepts', 'No expiry'],
  },
  {
    bundleCode: 'challenger',
    name: 'Pro',
    credits: 15,
    priceUsd: 10,
    pricePerCredit: 0.67,
    savingsPct: 33,
    featured: true,
    perks: ['15 challenge accepts', 'No expiry', 'Best seller'],
  },
  {
    bundleCode: 'pro',
    name: 'Best value',
    credits: 40,
    priceUsd: 20,
    pricePerCredit: 0.5,
    savingsPct: 50,
    featured: false,
    perks: ['40 challenge accepts', 'No expiry', 'Best price per credit'],
  },
]

const moneyUsd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})

function formatHistoryWhen(iso: string): string {
  const d = new Date(iso)
  const datePart = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(d)
  const timePart = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(d)
  return `${datePart} · ${timePart}`
}

function formatCreditDelta(credits: number): string {
  const n = Math.abs(credits)
  const unit = n === 1 ? 'credit' : 'credits'
  if (credits < 0) {
    return `\u2212${n} ${unit}`
  }
  return `+${n} ${unit}`
}

export function CreditsPage() {
  const { getToken } = useAuth()
  const [searchParams] = useSearchParams()
  const showOnboardingSkip = searchParams.get('onboarding') === '1'

  const [balance, setBalance] = useState<number | null>(null)
  const [history, setHistory] = useState<CreditHistoryItem[] | null>(null)
  const [loadingCode, setLoadingCode] = useState<BundleCode | null>(null)
  const [packErrors, setPackErrors] = useState<Partial<Record<BundleCode, string>>>({})

  const load = useCallback(async () => {
    try {
      const [b, h] = await Promise.all([
        fetchCreditBalance(getToken),
        fetchCreditHistory(getToken),
      ])
      setBalance(b)
      setHistory(h)
    } catch {
      setBalance(null)
      setHistory([])
    }
  }, [getToken])

  useEffect(() => {
    void load()
  }, [load])

  async function onBuy(bundleCode: BundleCode) {
    setPackErrors((prev) => {
      const next = { ...prev }
      delete next[bundleCode]
      return next
    })
    setLoadingCode(bundleCode)
    try {
      const url = await createCheckoutSession(getToken, bundleCode)
      window.location.href = url
    } catch (err) {
      setPackErrors((prev) => ({
        ...prev,
        [bundleCode]: formatError(err),
      }))
    } finally {
      setLoadingCode(null)
    }
  }

  return (
    <div className="credits-page">
      <h1 className="credits-page__title">Credits</h1>

      <div className="credits-page__balance">
        <div className="credits-page__balance-icon-wrap" aria-hidden>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75" />
            <path
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              d="M12 7v5l3 2"
            />
          </svg>
        </div>
        <div className="credits-page__balance-mid">
          <span className="credits-page__balance-label">Current balance</span>
          <div className="credits-page__balance-value">
            {balance === null ? '…' : `${balance} credits`}
          </div>
          <div className="credits-page__balance-hint">
            Each challenge costs 1 credit to accept
          </div>
        </div>
        <div className="credits-page__balance-stripe">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
          </svg>
          <span>Payments via Stripe</span>
        </div>
      </div>

      <div className="credits-page__explain-grid">
        <div className="credits-page__explain-card">
          <div
            className="credits-page__explain-icon credits-page__explain-icon--accent"
            aria-hidden
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L4 7v10l8 5 8-5V7l-8-5zm0 2.18l6 3.75v7.07l-6 3.75-6-3.75V7.93l6-3.75zM11 10h2v6h-2v-6zm0-4h2v2h-2V6z" />
            </svg>
          </div>
          <div>
            <span className="credits-page__explain-title">Accept a challenge</span>
            <p className="credits-page__explain-body">
              1 credit per challenge you accept from an opponent
            </p>
          </div>
        </div>
        <div className="credits-page__explain-card">
          <div
            className="credits-page__explain-icon credits-page__explain-icon--muted"
            aria-hidden
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
          </div>
          <div>
            <span className="credits-page__explain-title">Free to challenge</span>
            <p className="credits-page__explain-body">
              Sending a challenge to someone costs no credits
            </p>
          </div>
        </div>
        <div className="credits-page__explain-card">
          <div
            className="credits-page__explain-icon credits-page__explain-icon--success"
            aria-hidden
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
            </svg>
          </div>
          <div>
            <span className="credits-page__explain-title">Solo sessions are free</span>
            <p className="credits-page__explain-body">
              Record and log solo sets without spending credits
            </p>
          </div>
        </div>
      </div>

      <h2 className="credits-page__section-label">Top up your credits</h2>

      <div className="credits-page__pricing-grid">
        {PACKS.map((p) => {
          const err = packErrors[p.bundleCode]
          const busy = loadingCode !== null
          const rateParts = `${moneyUsd.format(p.pricePerCredit)} per credit`
          const savingsPart =
            p.savingsPct > 0 ? ` · Save ${p.savingsPct}%` : ''

          return (
            <div
              key={p.bundleCode}
              className={
                p.featured
                  ? 'credits-page__pack-wrap credits-page__pack-wrap--featured'
                  : 'credits-page__pack-wrap'
              }
            >
              <button
                type="button"
                className={
                  p.featured
                    ? 'credits-page__pack credits-page__pack--featured'
                    : 'credits-page__pack'
                }
                disabled={busy}
                onClick={() => void onBuy(p.bundleCode)}
              >
                {p.featured ? (
                  <span className="credits-page__pack-badge">Most popular</span>
                ) : null}
                <div className="credits-page__pack-name">{p.name}</div>
                <p className="credits-page__pack-credits">{p.credits}</p>
                <p className="credits-page__pack-credits-label">credits</p>
                <div className="credits-page__pack-price">
                  {moneyUsd.format(p.priceUsd)}
                </div>
                <div className="credits-page__pack-rate">
                  {rateParts}
                  {savingsPart}
                </div>
                <hr className="credits-page__pack-divider" />
                <ul className="credits-page__pack-perks">
                  {p.perks.map((perk) => (
                    <li key={perk} className="credits-page__pack-perk">
                      <span className="credits-page__pack-perk-dot" aria-hidden />
                      <span>{perk}</span>
                    </li>
                  ))}
                </ul>
                <span className="credits-page__pack-buy">
                  {loadingCode === p.bundleCode
                    ? 'Opening checkout…'
                    : `Buy — ${moneyUsd.format(p.priceUsd)}`}
                </span>
              </button>
              {err ? (
                <p className="credits-page__pack-error" role="alert">
                  {err}
                </p>
              ) : null}
            </div>
          )
        })}
      </div>

      {showOnboardingSkip ? (
        <Link className="credits-page__skip" to="/dashboard">
          Skip for now — you can top up anytime from the sidebar
        </Link>
      ) : null}

      <div className="credits-page__trust">
        <div className="credits-page__trust-item">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 2.18l7 3.12v5.7c0 4.25-3.12 8.21-7 9.16-3.88-.95-7-4.91-7-9.16V6.3l7-3.12zM11 7h2v6h-2V7zm0 8h2v2h-2v-2z" />
          </svg>
          <span>Secured by Stripe</span>
        </div>
        <div className="credits-page__trust-item">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
          </svg>
          <span>No subscriptions</span>
        </div>
        <div className="credits-page__trust-item">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
          </svg>
          <span>Credits never expire</span>
        </div>
        <div className="credits-page__trust-item">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z" />
          </svg>
          <span>Instant top-up</span>
        </div>
      </div>

      <h2 className="credits-page__history-label">Credit history</h2>
      <div className="credits-page__history-panel">
        {history === null ? (
          <p className="credits-page__history-empty" aria-busy="true">
            Loading…
          </p>
        ) : history.length === 0 ? (
          <p className="credits-page__history-empty">No credit activity yet.</p>
        ) : (
          history.map((row) => {
            const isSpend = row.type === 'spend'
            const metaDate = formatHistoryWhen(row.date)
            const paid =
              row.amount_paid_usd != null
                ? ` · ${moneyUsd.format(row.amount_paid_usd)}`
                : ''

            const refundRow = row.badge === 'auto_refund' && !isSpend
            const sub = row.subline?.trim()
            return (
              <div
                key={row.id}
                className={
                  refundRow
                    ? 'credits-page__history-row credits-page__history-row--refund'
                    : 'credits-page__history-row'
                }
              >
                <div
                  className={
                    isSpend
                      ? 'credits-page__history-icon credits-page__history-icon--spend'
                      : 'credits-page__history-icon credits-page__history-icon--earn'
                  }
                  aria-hidden
                >
                  {isSpend ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                    </svg>
                  )}
                </div>
                <div className="credits-page__history-body">
                  <div className="credits-page__history-desc">
                    {row.description}
                    {row.badge === 'entry_gifted' ? (
                      <span className="credits-page__history-badge credits-page__history-badge--gifted">
                        Entry gifted
                      </span>
                    ) : null}
                    {row.badge === 'auto_refund' ? (
                      <span className="credits-page__history-badge credits-page__history-badge--refund">
                        Auto-refunded
                      </span>
                    ) : null}
                  </div>
                  <div className="credits-page__history-meta">
                    {metaDate}
                    {sub ? ` · ${sub}` : ''}
                    {paid}
                  </div>
                </div>
                <div
                  className={
                    isSpend
                      ? 'credits-page__history-amount credits-page__history-amount--spend'
                      : 'credits-page__history-amount credits-page__history-amount--earn'
                  }
                >
                  {formatCreditDelta(row.credits)}
                </div>
              </div>
            )
          })
        )}
      </div>

      <div className="credits-page__refund-policy">
        <h3 className="credits-page__refund-policy-title">Refund policy</h3>
        <p className="credits-page__refund-policy-body">
          If a gifted challenge expires without a response, <strong>both credits are automatically refunded</strong> —
          yours and the gifted entry. You&apos;re never charged for a challenge that doesn&apos;t happen.
        </p>
      </div>
    </div>
  )
}

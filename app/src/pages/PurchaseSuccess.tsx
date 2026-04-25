import { useEffect } from 'react'
import { Link } from 'react-router-dom'

import { requestCreditBalanceRefresh } from '../lib/creditBalanceRefresh'

export function PurchaseSuccess() {
  useEffect(() => {
    requestCreditBalanceRefresh()
    // Webhook may apply credits slightly after redirect; one delayed refetch helps.
    const t = window.setTimeout(requestCreditBalanceRefresh, 2500)
    return () => window.clearTimeout(t)
  }, [])

  return (
    <section className="stack narrow">
      <h1 className="page-title">Payment received</h1>
      <p className="lede">
        Thanks — Stripe is processing your payment. You will get a receipt by email from
        Stripe when applicable. Credits are applied on our side after Stripe confirms the
        checkout; this page does not grant credits by itself.
      </p>
      <p className="lede">
        <Link className="btn btn-primary" to="/challenge">
          Start a challenge
        </Link>
      </p>
      <p className="muted" style={{ fontSize: '0.95rem' }}>
        <Link to="/">Back home</Link>
      </p>
    </section>
  )
}

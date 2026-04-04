import { Link } from 'react-router-dom'

export function PurchaseSuccess() {
  return (
    <section className="stack narrow">
      <h1 className="page-title">Payment received</h1>
      <p className="lede">
        Thanks — Stripe is processing your payment. You will get a receipt by email from
        Stripe when applicable. Credits are applied on our side after Stripe confirms the
        checkout; this page does not grant credits by itself.
      </p>
      <p className="lede">
        <Link className="btn btn-primary" to="/challenge/start">
          Start a challenge
        </Link>
      </p>
      <p className="muted" style={{ fontSize: '0.95rem' }}>
        <Link to="/">Back home</Link>
      </p>
    </section>
  )
}

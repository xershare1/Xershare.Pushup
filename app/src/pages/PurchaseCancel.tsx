import { Link } from 'react-router-dom'

export function PurchaseCancel() {
  return (
    <section className="stack narrow">
      <h1 className="page-title">Checkout canceled</h1>
      <p className="lede">
        No charge was made. You can return to credit packs whenever you are ready.
      </p>
      <p className="lede">
        <Link className="btn btn-primary" to="/credits">
          View credit packs
        </Link>
      </p>
      <p className="muted" style={{ fontSize: '0.95rem' }}>
        <Link to="/">Back home</Link>
      </p>
    </section>
  )
}

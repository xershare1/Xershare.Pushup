import { Link } from 'react-router-dom'

export function Home() {
  return (
    <section className="stack">
      <div className="hero-block">
        <p className="eyebrow">PushupPros</p>
        <h1 className="page-title">Challenge a friend to a pushup battle</h1>
        <p className="lede">
          Create a challenge, share the link, log your reps, and see who wins.
          Built for a fast, phone-first flow.
        </p>
        <div className="actions">
          <Link className="btn btn-primary" to="/challenge/create">
            Start a challenge
          </Link>
          <Link className="btn btn-ghost" to="/leaderboard">
            Leaderboard
          </Link>
        </div>
      </div>
    </section>
  )
}

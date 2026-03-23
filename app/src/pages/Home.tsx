import { Link } from 'react-router-dom'

export function Home() {
  return (
    <section className="hero">
      <div className="hero-inner">
        <h1 className="hero-title">Challenge a friend to a pushup battle</h1>
        <p className="hero-sub">
          Create a challenge, share the link, log your reps, and see who wins.
          Built for a fast, phone-first flow.
        </p>
        <div className="hero-actions">
          <Link className="btn btn-primary" to="/challenge/create">
            Start a challenge
          </Link>
          <Link className="btn btn-secondary" to="/leaderboard">
            Leaderboard
          </Link>
        </div>
      </div>
    </section>
  )
}

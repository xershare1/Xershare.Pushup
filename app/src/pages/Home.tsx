import { Show } from '@clerk/react'
import { Link, Navigate } from 'react-router-dom'

export function Home() {
  return (
    <>
      <Show when="signed-in">
        <Navigate to="/dashboard" replace />
      </Show>
      <Show when="signed-out">
        <section className="hero">
          <div className="hero-inner">
            <h1 className="hero-title">Challenge a friend to a pushup battle</h1>
            <p className="hero-sub">
              Create a challenge, share the link, log your reps, and see who wins.
              Built for a fast, phone-first flow.
            </p>
            <div className="hero-actions">
              <Link className="btn btn-primary" to="/solo">
                Solo session
              </Link>
              <Link className="btn btn-secondary" to="/challenge/start">
                Start a challenge
              </Link>
              <Link className="btn btn-secondary" to="/leaderboard">
                Leaderboard
              </Link>
            </div>
            {import.meta.env.DEV ? (
              <p className="hero-sub" style={{ marginTop: '1.5rem', fontSize: '0.9rem' }}>
                <Link to="/dev/pushup-lab">Pushup algorithm lab</Link> (dev)
              </p>
            ) : null}
          </div>
        </section>
      </Show>
    </>
  )
}

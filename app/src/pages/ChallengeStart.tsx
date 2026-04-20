import { Link } from 'react-router-dom'

/**
 * Entry to the challenge flow: compete with someone (no camera session here).
 * Solo practice lives at /solo.
 */
export function ChallengeStart() {
  return (
    <section className="stack narrow">
      <h1 className="page-title">Start a challenge</h1>
      <p className="lede">
        Create a challenge, share the link with your opponent, and both log your reps. No
        camera required to get started.
      </p>

      <div className="card stack">
        <div
          className="actions"
          style={{ flexDirection: 'column', alignItems: 'stretch' }}
        >
          <Link className="btn btn-primary" to="/challenge/create">
            Create a challenge
          </Link>
        </div>
        <p className="muted" style={{ margin: 0, fontSize: '0.9rem' }}>
          Just practicing?{' '}
          <Link to="/solo">Solo session</Link> — log reps for yourself only.
        </p>
      </div>
    </section>
  )
}

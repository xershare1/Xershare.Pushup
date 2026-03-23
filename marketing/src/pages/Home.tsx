import { Link } from 'react-router-dom'
import { CHALLENGE_APP_URL } from '../constants'

export function Home() {
  return (
    <section className="hero">
      <div className="hero-inner">
        <h1 className="hero-title">Challenge a friend to a pushup battle</h1>
        <p className="hero-sub">
          Send a link. They respond. Winner takes it.
        </p>
        <div className="hero-actions">
          <a
            className="btn btn-primary"
            href={`${CHALLENGE_APP_URL}/challenge/create`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Start Challenge
          </a>
          <Link className="btn btn-secondary" to="/how-it-works">
            How it works
          </Link>
        </div>
      </div>
    </section>
  )
}

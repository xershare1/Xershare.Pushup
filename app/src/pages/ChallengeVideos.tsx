import { useAuth } from '@clerk/react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { fetchChallengeVideos, type ChallengeVideoItem } from '../api/challenges'
import { HttpError } from '../api/httpError'
import { formatError } from '../lib/formatError'

function formatSubmitted(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return iso
  }
}

export function ChallengeVideos() {
  const { getToken } = useAuth()
  const [items, setItems] = useState<ChallengeVideoItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const list = await fetchChallengeVideos(getToken)
        if (!cancelled) setItems(list)
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof HttpError ? e.message : formatError(e))
          setItems(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [getToken])

  return (
    <section className="challenge-videos-page stack narrow">
      <header>
        <h1 className="page-title">Challenge videos</h1>
        <p className="lede">
          Recordings from submitted challenge attempts (uploaded when you confirm your score).
        </p>
      </header>

      {loading ? <p className="muted">Loading…</p> : null}
      {error ? (
        <p className="banner banner-error" role="alert">
          {error}
        </p>
      ) : null}

      {!loading && !error && items && items.length === 0 ? (
        <div className="card stack">
          <p className="muted">
            No challenge videos yet. Submit a challenge attempt with a recording, or open an existing
            challenge.
          </p>
          <div className="actions wrap">
            <Link className="btn btn-primary" to="/challenge/start">
              Start a challenge
            </Link>
            <Link className="btn btn-ghost" to="/my-challenges">
              My challenges
            </Link>
          </div>
        </div>
      ) : null}

      {!loading && items && items.length > 0 ? (
        <ul className="challenge-videos-list">
          {items.map((row) => (
            <li key={`${row.challengeId}-${row.role}`} className="challenge-videos-row card">
              <div>
                <p className="challenge-videos-title">
                  Challenge <span className="challenge-videos-id">{row.challengeId}</span>
                </p>
                <p className="muted challenge-videos-meta">
                  {row.role === 'challenger' ? 'Challenger' : 'Opponent'} · {row.pushupCount} reps ·{' '}
                  {formatSubmitted(row.submittedAt)}
                </p>
              </div>
              <div className="challenge-videos-actions">
                {row.videoUrl ? (
                  <a
                    className="btn btn-secondary"
                    href={row.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open video
                  </a>
                ) : (
                  <span className="muted">Link unavailable</span>
                )}
                <Link className="btn btn-ghost" to={`/c/${row.challengeId}`}>
                  Challenge
                </Link>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}

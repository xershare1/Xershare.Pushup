import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getChallenge } from '../api/challenges'
import type { Challenge } from '../types/challenge'
import { getLifecycle } from '../lib/challengeLifecycle'
import { formatError } from '../lib/formatError'

export function ChallengeDetail() {
  const { challengeId } = useParams()
  const [challenge, setChallenge] = useState<Challenge | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const shareUrl = useMemo(() => {
    if (!challengeId) return ''
    return `${window.location.origin}/c/${challengeId}`
  }, [challengeId])

  useEffect(() => {
    if (!challengeId) return
    let cancelled = false
    void (async () => {
      await Promise.resolve()
      if (cancelled) return
      setLoading(true)
      setError(null)
      try {
        const c = await getChallenge(challengeId)
        if (!cancelled) setChallenge(c)
      } catch (err) {
        if (!cancelled) setError(formatError(err))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [challengeId])

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl)
    } catch {
      // ignore
    }
  }

  if (!challengeId) {
    return <p className="muted">Missing challenge id.</p>
  }

  if (loading) {
    return <p className="muted">Loading challenge…</p>
  }

  if (error) {
    return (
      <section className="stack narrow">
        <p className="banner banner-error" role="alert">
          {error}
        </p>
        <Link className="btn btn-ghost" to="/">
          Back home
        </Link>
      </section>
    )
  }

  if (!challenge) {
    return null
  }

  const life = getLifecycle(challenge)

  return (
    <section className="stack narrow">
      <h1 className="page-title">Challenge</h1>
      <p className="lede">
        Share this page so your opponent can log their reps.
      </p>

      <div className="card">
        <dl className="facts">
          <div>
            <dt>Challenger</dt>
            <dd>{challenge.challengerName}</dd>
          </div>
          <div>
            <dt>Opponent</dt>
            <dd>{challenge.opponentName}</dd>
          </div>
          {challenge.message ? (
            <div className="full">
              <dt>Message</dt>
              <dd>{challenge.message}</dd>
            </div>
          ) : null}
          <div>
            <dt>Status</dt>
            <dd>
              {life === 'complete'
                ? 'Complete'
                : life === 'partial'
                  ? 'Waiting on the other score'
                  : 'No scores yet'}
            </dd>
          </div>
        </dl>

        <div className="actions wrap">
          <button className="btn btn-secondary" type="button" onClick={copyLink}>
            Copy challenge link
          </button>
          {life !== 'complete' ? (
            <Link className="btn btn-primary" to={`/c/${challenge.id}/submit`}>
              Log reps
            </Link>
          ) : (
            <Link className="btn btn-primary" to={`/c/${challenge.id}/result`}>
              View result
            </Link>
          )}
        </div>
      </div>
    </section>
  )
}

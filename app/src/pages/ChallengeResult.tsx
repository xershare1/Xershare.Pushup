import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getResult } from '../api/challenges'
import type { ChallengeOutcome } from '../types/challenge'
import { formatError } from '../lib/formatError'

export function ChallengeResult() {
  const { challengeId } = useParams()
  const [outcome, setOutcome] = useState<ChallengeOutcome | null>(null)
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
        const o = await getResult(challengeId)
        if (!cancelled) setOutcome(o)
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

  async function copyChallengeLink() {
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
    return <p className="muted">Loading result…</p>
  }

  if (error) {
    return (
      <section className="stack narrow">
        <p className="banner banner-error" role="alert">
          {error}
        </p>
        <div className="actions wrap">
          <Link className="btn btn-ghost" to={`/c/${challengeId}`}>
            Back to challenge
          </Link>
          <Link className="btn btn-primary" to="/challenge/create">
            New challenge
          </Link>
        </div>
      </section>
    )
  }

  if (!outcome) {
    return null
  }

  const winnerLabel =
    outcome.winner === 'tie'
      ? "It's a tie"
      : outcome.winner === 'challenger'
        ? `${outcome.challengerName} wins`
        : `${outcome.opponentName} wins`

  return (
    <section className="stack narrow">
      <h1 className="page-title">Result</h1>
      <p className="lede">{winnerLabel}</p>

      <div className="card">
        <dl className="facts">
          <div>
            <dt>{outcome.challengerName}</dt>
            <dd>{outcome.challengerPushups} pushups</dd>
          </div>
          <div>
            <dt>{outcome.opponentName}</dt>
            <dd>{outcome.opponentPushups} pushups</dd>
          </div>
        </dl>

        <div className="actions wrap">
          <Link className="btn btn-primary" to="/challenge/create">
            Rematch
          </Link>
          <button className="btn btn-secondary" type="button" onClick={copyChallengeLink}>
            Share challenge link
          </button>
        </div>
      </div>
    </section>
  )
}

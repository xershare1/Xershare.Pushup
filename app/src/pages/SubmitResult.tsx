import { type FormEvent, useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { getChallenge, submitAttempt } from '../api/challenges'
import type { Challenge, ParticipantRole } from '../types/challenge'
import { getLifecycle } from '../lib/challengeLifecycle'
import { formatError } from '../lib/formatError'

export function SubmitResult() {
  const { challengeId } = useParams()
  const navigate = useNavigate()
  const [challenge, setChallenge] = useState<Challenge | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [participantName, setParticipantName] = useState('')
  const [pushupCount, setPushupCount] = useState('')
  const [role, setRole] = useState<ParticipantRole>('challenger')

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
        if (!cancelled) {
          setChallenge(c)
          if (c.challengerPushups !== null && c.opponentPushups === null) {
            setRole('opponent')
          }
        }
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

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!challengeId) return
    setError(null)
    setSubmitting(true)
    const count = Number(pushupCount)
    if (!Number.isFinite(count) || count < 0) {
      setError('Enter a valid pushup count.')
      setSubmitting(false)
      return
    }

    try {
      const updated = await submitAttempt(challengeId, {
        participantName,
        pushupCount: count,
        role,
      })
      const done = getLifecycle(updated) === 'complete'
      navigate(done ? `/c/${challengeId}/result` : `/c/${challengeId}`)
    } catch (err) {
      setError(formatError(err))
    } finally {
      setSubmitting(false)
    }
  }

  if (!challengeId) {
    return <p className="muted">Missing challenge id.</p>
  }

  if (loading) {
    return <p className="muted">Loading challenge…</p>
  }

  if (error && !challenge) {
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

  if (challenge.challengerPushups !== null && challenge.opponentPushups !== null) {
    return <Navigate to={`/c/${challenge.id}/result`} replace />
  }

  const challengerLocked = challenge.challengerPushups !== null
  const opponentLocked = challenge.opponentPushups !== null

  return (
    <section className="stack narrow">
      <h1 className="page-title">Log reps</h1>
      <p className="lede">
        Enter your name and how many pushups you completed for this challenge.
      </p>

      <form className="card form" onSubmit={onSubmit}>
        {error ? (
          <p className="banner banner-error" role="alert">
            {error}
          </p>
        ) : null}

        <fieldset className="field">
          <legend>You are</legend>
          <label className="inline">
            <input
              type="radio"
              name="role"
              checked={role === 'challenger'}
              disabled={challengerLocked}
              onChange={() => setRole('challenger')}
            />
            <span>Challenger ({challenge.challengerName})</span>
          </label>
          <label className="inline">
            <input
              type="radio"
              name="role"
              checked={role === 'opponent'}
              disabled={opponentLocked}
              onChange={() => setRole('opponent')}
            />
            <span>Opponent ({challenge.opponentName})</span>
          </label>
        </fieldset>

        <label className="field">
          <span>Participant name</span>
          <input
            name="participantName"
            autoComplete="name"
            required
            value={participantName}
            onChange={(e) => setParticipantName(e.target.value)}
          />
        </label>

        <label className="field">
          <span>Pushup count</span>
          <input
            name="pushupCount"
            inputMode="numeric"
            required
            min={0}
            value={pushupCount}
            onChange={(e) => setPushupCount(e.target.value)}
          />
        </label>

        <div className="actions wrap">
          <button className="btn btn-primary" type="submit" disabled={submitting}>
            {submitting ? 'Saving…' : 'Submit'}
          </button>
          <Link className="btn btn-ghost" to={`/c/${challenge.id}`}>
            Cancel
          </Link>
        </div>
      </form>
    </section>
  )
}

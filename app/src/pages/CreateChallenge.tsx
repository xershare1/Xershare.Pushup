import { type FormEvent, useState } from 'react'
import { useAuth } from '@clerk/react'
import { useNavigate } from 'react-router-dom'
import { createChallenge } from '../api/challenges'
import { formatError } from '../lib/formatError'

export function CreateChallenge() {
  const navigate = useNavigate()
  const { userId } = useAuth()
  const [challengerName, setChallengerName] = useState('')
  const [opponentName, setOpponentName] = useState('')
  const [message, setMessage] = useState('')
  const [opponentClerkUserId, setOpponentClerkUserId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await createChallenge({
        challengerName,
        opponentName,
        message: message.trim() ? message : undefined,
        challengerClerkUserId: userId ?? undefined,
        opponentClerkUserId: opponentClerkUserId.trim()
          ? opponentClerkUserId.trim()
          : undefined,
      })
      navigate(`/c/${res.challenge.id}`)
    } catch (err) {
      setError(formatError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="stack narrow">
      <h1 className="page-title">Create challenge</h1>
      <p className="lede">
        Name both sides and add an optional message. You will get a shareable
        link on the next screen. If your opponent has a Pushup Pros account, you
        can enter their Clerk user ID so we can email them (never your own
        arbitrary email for automated mail).
      </p>

      <form className="card form" onSubmit={onSubmit}>
        {error ? (
          <p className="banner banner-error" role="alert">
            {error}
          </p>
        ) : null}

        <label className="field">
          <span>Your name (challenger)</span>
          <input
            name="challengerName"
            autoComplete="name"
            required
            value={challengerName}
            onChange={(e) => setChallengerName(e.target.value)}
          />
        </label>

        <label className="field">
          <span>Opponent name or label</span>
          <input
            name="opponentName"
            required
            value={opponentName}
            onChange={(e) => setOpponentName(e.target.value)}
          />
        </label>

        <label className="field">
          <span>Opponent Clerk user ID (optional)</span>
          <input
            name="opponentClerkUserId"
            autoComplete="off"
            placeholder="user_… (only if opponent is a member)"
            value={opponentClerkUserId}
            onChange={(e) => setOpponentClerkUserId(e.target.value)}
          />
        </label>

        <label className="field">
          <span>Message (optional)</span>
          <textarea
            name="message"
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </label>

        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? 'Creating…' : 'Create challenge'}
        </button>
      </form>
    </section>
  )
}

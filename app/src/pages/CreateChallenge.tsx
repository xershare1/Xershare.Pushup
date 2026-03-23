import { type FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createChallenge } from '../api/challenges'
import { formatError } from '../lib/formatError'

export function CreateChallenge() {
  const navigate = useNavigate()
  const [challengerName, setChallengerName] = useState('')
  const [opponentName, setOpponentName] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const created = await createChallenge({
        challengerName,
        opponentName,
        message: message.trim() ? message : undefined,
      })
      navigate(`/c/${created.id}`)
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
        link on the next screen.
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

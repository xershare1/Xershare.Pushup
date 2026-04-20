import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { SignInButton, useAuth, useUser } from '@clerk/react'
import {
  acceptChallenge,
  cancelChallenge,
  declineChallenge,
  getChallenge,
} from '../api/challenges'
import type { Challenge } from '../types/challenge'
import { getLifecycle } from '../lib/challengeLifecycle'
import { formatError } from '../lib/formatError'

function canRespondAsOpponent(ch: Challenge, userId: string | undefined): boolean {
  if (!userId) return false
  if ((ch.status ?? '').toLowerCase() !== 'proposed') return false
  const chClerk = (ch.challengerClerkUserId ?? '').trim()
  const opClerk = (ch.opponentClerkUserId ?? '').trim()
  if (userId === chClerk) return false
  if (opClerk) return userId === opClerk
  return Boolean(chClerk)
}

function isChallenger(ch: Challenge, userId: string | undefined): boolean {
  if (!userId) return false
  return (ch.challengerClerkUserId ?? '').trim() === userId
}

export function ChallengeDetail() {
  const { challengeId } = useParams()
  const { user, isSignedIn } = useUser()
  const { getToken } = useAuth()
  const [challenge, setChallenge] = useState<Challenge | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const userId = user?.id

  const shareUrl = useMemo(() => {
    if (!challengeId) return ''
    return `${window.location.origin}/c/${challengeId}`
  }, [challengeId])

  const load = useCallback(async () => {
    if (!challengeId) return
    setLoading(true)
    setError(null)
    try {
      const c = await getChallenge(challengeId)
      setChallenge(c)
    } catch (err) {
      setError(formatError(err))
    } finally {
      setLoading(false)
    }
  }, [challengeId])

  useEffect(() => {
    void load()
  }, [load])

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl)
    } catch {
      // ignore
    }
  }

  async function onAccept() {
    if (!challengeId) return
    setBusy(true)
    setActionError(null)
    try {
      const c = await acceptChallenge(getToken, challengeId)
      setChallenge(c)
    } catch (e) {
      setActionError(formatError(e))
    } finally {
      setBusy(false)
    }
  }

  async function onDecline() {
    if (!challengeId) return
    setBusy(true)
    setActionError(null)
    try {
      const c = await declineChallenge(getToken, challengeId)
      setChallenge(c)
    } catch (e) {
      setActionError(formatError(e))
    } finally {
      setBusy(false)
    }
  }

  async function onCancel() {
    if (!challengeId) return
    setBusy(true)
    setActionError(null)
    try {
      const c = await cancelChallenge(getToken, challengeId)
      setChallenge(c)
    } catch (e) {
      setActionError(formatError(e))
    } finally {
      setBusy(false)
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
  const st = (challenge.status ?? '').toLowerCase()

  let statusLabel: string
  if (st === 'declined') statusLabel = 'Declined'
  else if (st === 'cancelled') statusLabel = 'Cancelled'
  else if (st === 'expired') statusLabel = 'Expired'
  else if (st === 'proposed') statusLabel = 'Waiting for opponent to accept'
  else if (life === 'complete') statusLabel = 'Complete'
  else if (life === 'partial') statusLabel = 'Waiting on the other score'
  else statusLabel = 'No scores yet'

  const proposed = st === 'proposed'
  const showLogReps = !proposed && st !== 'declined' && st !== 'cancelled' && st !== 'expired'
  const challengerView = isChallenger(challenge, userId)
  const opponentCanRespond = canRespondAsOpponent(challenge, userId)

  return (
    <section className="stack narrow">
      <h1 className="page-title">Challenge</h1>
      <p className="lede">
        {proposed
          ? 'Your opponent needs to accept before either of you can log reps.'
          : 'Share this page so your opponent can log their reps.'}
      </p>

      <div className="card">
        {actionError ? (
          <p className="banner banner-error" role="alert" style={{ marginBottom: '1rem' }}>
            {actionError}
          </p>
        ) : null}

        {proposed && !isSignedIn ? (
          <p className="banner" role="status" style={{ marginBottom: '1rem' }}>
            Sign in to accept or decline this challenge.
          </p>
        ) : null}

        {proposed && isSignedIn && opponentCanRespond ? (
          <div className="actions wrap" style={{ marginBottom: '1rem' }}>
            <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void onAccept()}>
              Accept challenge
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={busy}
              onClick={() => void onDecline()}
            >
              Decline
            </button>
          </div>
        ) : null}

        {proposed && isSignedIn && challengerView ? (
          <div className="actions wrap" style={{ marginBottom: '1rem' }}>
            <p className="muted" style={{ margin: 0, flex: '1 1 200px' }}>
              Waiting for your opponent to accept.
            </p>
            <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => void onCancel()}>
              Cancel invite
            </button>
          </div>
        ) : null}

        {proposed && isSignedIn && !challengerView && !opponentCanRespond ? (
          <p className="muted" style={{ marginBottom: '1rem' }}>
            You’re not the invited opponent for this challenge.
          </p>
        ) : null}

        {proposed && !isSignedIn ? (
          <div className="actions wrap" style={{ marginBottom: '1rem' }}>
            <SignInButton mode="modal" forceRedirectUrl={shareUrl}>
              <button type="button" className="btn btn-primary">
                Sign in
              </button>
            </SignInButton>
          </div>
        ) : null}

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
            <dd>{statusLabel}</dd>
          </div>
        </dl>

        <div className="actions wrap">
          <button className="btn btn-secondary" type="button" onClick={copyLink}>
            Copy challenge link
          </button>
          {showLogReps && life !== 'complete' ? (
            <Link className="btn btn-primary" to={`/c/${challenge.id}/submit`}>
              Log reps
            </Link>
          ) : null}
          {showLogReps && life === 'complete' ? (
            <Link className="btn btn-primary" to={`/c/${challenge.id}/result`}>
              View result
            </Link>
          ) : null}
        </div>
      </div>

      {isSignedIn ? (
        <p className="muted" style={{ marginTop: '1rem' }}>
          <Link to="/my-challenges">View all my challenges</Link>
        </p>
      ) : null}
    </section>
  )
}

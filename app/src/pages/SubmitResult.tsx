import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { useAuth, useUser } from '@clerk/react'
import { getChallenge, submitAttempt } from '../api/challenges'
import type { Challenge, ParticipantRole } from '../types/challenge'
import { formatError } from '../lib/formatError'
import { PushupSession } from '../components/pushupSession/PushupSession'

function nameFromSession(user: ReturnType<typeof useUser>['user']): string {
  if (!user) return 'Challenger'
  const full = user.fullName?.trim()
  if (full) return full
  const fn = user.firstName?.trim() ?? ''
  const ln = user.lastName?.trim() ?? ''
  const combined = `${fn} ${ln}`.trim()
  if (combined) return combined
  if (user.username) return user.username
  const em = user.primaryEmailAddress?.emailAddress
  if (em) {
    const local = em.split('@')[0]
    if (local) return local
  }
  return 'Challenger'
}

type Step = 'loading' | 'session' | 'confirm' | 'submitting' | 'error'

/** Prefer Clerk identity over score heuristics so the opponent never submits as challenger. */
function inferParticipantRole(c: Challenge, clerkUserId: string | undefined): ParticipantRole {
  const uid = (clerkUserId ?? '').trim()
  const ch = (c.challengerClerkUserId ?? '').trim()
  const op = (c.opponentClerkUserId ?? '').trim()

  if (uid && ch && uid === ch) return 'challenger'
  if (uid && op && uid === op) return 'opponent'

  if (c.challengerPushups !== null && c.opponentPushups === null) return 'opponent'
  if (c.opponentPushups !== null && c.challengerPushups === null) return 'challenger'

  if (uid && ch && !op && uid !== ch) return 'opponent'

  return 'challenger'
}

export function SubmitResult() {
  const { challengeId } = useParams()
  const navigate = useNavigate()
  const { user } = useUser()
  const { getToken } = useAuth()

  const [challenge, setChallenge] = useState<Challenge | null>(null)
  const [role, setRole] = useState<ParticipantRole>('challenger')
  const [step, setStep] = useState<Step>('loading')
  const [pendingReps, setPendingReps] = useState<number | null>(null)
  const [pendingRecording, setPendingRecording] = useState<Blob | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    if (!challengeId) return
    let cancelled = false
    void (async () => {
      await Promise.resolve()
      if (cancelled) return
      setStep('loading')
      setLoadError(null)
      try {
        const c = await getChallenge(challengeId)
        if (cancelled) return
        setChallenge(c)
        if ((c.status ?? '').toLowerCase() === 'proposed') {
          setLoadError('This challenge has not been accepted yet. Go back to the challenge page to accept or decline.')
          setStep('error')
          return
        }
        setRole(inferParticipantRole(c, user?.id))
        setStep('session')
      } catch (err) {
        if (!cancelled) {
          setLoadError(formatError(err))
          setStep('error')
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [challengeId, user?.id])

  const onSessionComplete = useCallback((reps: number, recording: Blob | null) => {
    setPendingReps(reps)
    setPendingRecording(recording)
    setStep('confirm')
  }, [])

  async function onConfirmSubmit() {
    if (!challengeId || pendingReps === null) return
    setSubmitError(null)
    setStep('submitting')
    const participantName = nameFromSession(user)
    try {
      await submitAttempt(getToken, challengeId, {
        participantName,
        pushupCount: pendingReps,
        role,
        video: pendingRecording && pendingRecording.size > 0 ? pendingRecording : undefined,
      })
      navigate(`/c/${challengeId}`)
    } catch (err) {
      setSubmitError(formatError(err))
      setStep('confirm')
    }
  }

  function onRedo() {
    setPendingReps(null)
    setPendingRecording(null)
    setSubmitError(null)
    setStep('session')
  }

  if (!challengeId) {
    return <p className="muted">Missing challenge id.</p>
  }

  if (step === 'loading') {
    return <p className="muted">Loading challenge…</p>
  }

  if (step === 'error') {
    return (
      <section className="stack narrow">
        <p className="banner banner-error" role="alert">
          {loadError}
        </p>
        <div className="actions wrap">
          {challengeId ? (
            <Link className="btn btn-primary" to={`/c/${challengeId}`}>
              Back to challenge
            </Link>
          ) : null}
          <Link className="btn btn-ghost" to="/">
            Back home
          </Link>
        </div>
      </section>
    )
  }

  if (!challenge) return null

  if (challenge.challengerPushups !== null && challenge.opponentPushups !== null) {
    return <Navigate to={`/c/${challenge.id}`} replace />
  }

  if (step === 'session') {
    return (
      <section className="stack pushup-session-page">
        <PushupSession
          onBack={() => navigate(`/c/${challengeId}`)}
          onSessionComplete={onSessionComplete}
          variant="default"
        />
      </section>
    )
  }

  return (
    <section className="stack narrow">
      <h1 className="page-title">Your result</h1>
      <p className="lede">
        You did <strong>{pendingReps}</strong> push-up{pendingReps !== 1 ? 's' : ''} for this
        challenge. Submit to lock in your score.
      </p>

      <div className="card form stack">
        {submitError ? (
          <p className="banner banner-error" role="alert">
            {submitError}
          </p>
        ) : null}

        <div className="actions wrap">
          <button
            type="button"
            className="btn btn-primary"
            onClick={onConfirmSubmit}
            disabled={step === 'submitting'}
          >
            {step === 'submitting' ? 'Submitting…' : `Submit ${pendingReps ?? ''} reps`}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onRedo}
            disabled={step === 'submitting'}
          >
            Redo session
          </button>
          <Link className="btn btn-ghost" to={`/c/${challengeId}`}>
            Cancel
          </Link>
        </div>
      </div>
    </section>
  )
}

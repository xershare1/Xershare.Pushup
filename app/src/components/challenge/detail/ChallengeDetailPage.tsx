import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { SignInButton, useAuth, useUser } from '@clerk/react'

import '../../../pages/ChallengeDetail.css'
import '../../../pages/ChallengeDetailGift.css'
import {
  acceptChallenge,
  cancelChallenge,
  declineChallenge,
  getChallenge,
  getResult,
} from '../../../api/challenges'
import type { Challenge, ChallengeOutcome } from '../../../types/challenge'
import { getLifecycle } from '../../../lib/challengeLifecycle'
import { formatError } from '../../../lib/formatError'
import { PageLoading } from '../../ui/PageLoading'

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

function isOpponent(ch: Challenge, userId: string | undefined): boolean {
  if (!userId) return false
  return (ch.opponentClerkUserId ?? '').trim() === userId
}

function hoursLeftLabel(expiresAt: string | null | undefined): string {
  if (!expiresAt) return '—'
  const ms = new Date(expiresAt).getTime() - Date.now()
  if (ms <= 0) return '0h'
  const h = Math.floor(ms / 3_600_000)
  if (h >= 48) return '48h+'
  if (h < 1) return '<1h'
  return `${h}h`
}

function avatarBg(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h + name.charCodeAt(i) * 7) % 360
  return `hsl(${h} 50% 36%)`
}

function initialsFor(name: string): string {
  const p = name.trim().split(/\s+/)
  if (p.length >= 2) return (p[0]!.charAt(0) + p[1]!.charAt(0)).toUpperCase()
  return name.trim().slice(0, 2).toUpperCase() || '?'
}

function formatShortDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return '—'
  }
}

function deriveOutcomeFromChallenge(ch: Challenge): ChallengeOutcome {
  const a = ch.challengerPushups ?? 0
  const b = ch.opponentPushups ?? 0
  let winner: ChallengeOutcome['winner']
  if (a === b) winner = 'tie'
  else if (a > b) winner = 'challenger'
  else winner = 'opponent'
  return {
    challengeId: ch.id,
    challengerName: ch.challengerName,
    opponentName: ch.opponentName,
    challengerPushups: a,
    opponentPushups: b,
    winner,
  }
}

type FighterColProps = {
  name: string
  you: boolean
  score: number | null
  showDash: boolean
  dimScore: boolean
  sub?: ReactNode
}

function FighterCol(p: FighterColProps) {
  return (
    <div className="cd-fighter">
      <div className="cd-fighter__av" style={{ background: avatarBg(p.name) }} aria-hidden>
        {initialsFor(p.name)}
      </div>
      <div className="cd-fighter__name">
        {p.name}
        {p.you ? <span className="cd-you">you</span> : null}
      </div>
      {p.showDash ? (
        <div className="cd-fighter__score cd-fighter__score--dash" aria-label="Not recorded">
          —
        </div>
      ) : (
        <div className={`cd-fighter__score${p.dimScore ? ' cd-fighter__score--dim' : ''}`}>{p.score}</div>
      )}
      <div className="cd-fighter__reps">reps</div>
      {p.sub ? <div className="cd-fighter__sub">{p.sub}</div> : null}
    </div>
  )
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
  const [giftedFreeAcceptCelebration, setGiftedFreeAcceptCelebration] = useState(false)
  const [outcome, setOutcome] = useState<ChallengeOutcome | null>(null)

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

  useEffect(() => {
    setGiftedFreeAcceptCelebration(false)
  }, [challengeId])

  useEffect(() => {
    if (!challengeId || !challenge) {
      setOutcome(null)
      return
    }
    if (getLifecycle(challenge) !== 'complete') {
      setOutcome(null)
      return
    }
    setOutcome(deriveOutcomeFromChallenge(challenge))
    let c = false
    void getResult(challengeId)
      .then((o) => {
        if (!c) setOutcome(o)
      })
      .catch(() => {
        /* keep derived */
      })
    return () => {
      c = true
    }
  }, [challengeId, challenge])

  const effectiveOutcome = useMemo(() => {
    if (!challenge || getLifecycle(challenge) !== 'complete') return null
    return outcome ?? deriveOutcomeFromChallenge(challenge)
  }, [challenge, outcome])

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl)
    } catch {
      /* ignore */
    }
  }

  async function shareLink() {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: 'Pushup challenge', url: shareUrl })
        return
      } catch {
        /* user cancelled */
      }
    }
    void copyLink()
  }

  async function onAccept() {
    if (!challengeId) return
    setBusy(true)
    setActionError(null)
    const wasGifted =
      challenge?.gifted === true && canRespondAsOpponent(challenge, userId)
    try {
      const c = await acceptChallenge(getToken, challengeId)
      setChallenge(c)
      if (wasGifted) setGiftedFreeAcceptCelebration(true)
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
    return (
      <div className="cd-page">
        <div className="cd-page__inner">
          <PageLoading
            className="cd-page__loading"
            pageDensity="tight"
            message="Loading challenge…"
            messageClassName="app-page-loading__msg cd-link-quiet"
          />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="cd-page">
        <div className="cd-page__inner">
          <p className="banner banner-error" role="alert">
            {error}
          </p>
          <Link className="cd-btn cd-btn--ghost" to="/" style={{ marginTop: 12, display: 'inline-flex' }}>
            Back home
          </Link>
        </div>
      </div>
    )
  }

  if (!challenge) {
    return null
  }

  const ch = challenge
  const life = getLifecycle(ch)
  const st = (ch.status ?? '').toLowerCase()
  const terminal = st === 'declined' || st === 'cancelled' || st === 'expired'
  const proposed = st === 'proposed'
  const youCh = isChallenger(ch, userId)
  const youOp = isOpponent(ch, userId)
  const opponentCanRespond = canRespondAsOpponent(ch, userId)
  const showLogReps = !proposed && !terminal
  const challengerView = isChallenger(ch, userId)
  const a = ch.challengerPushups
  const b = ch.opponentPushups

  const youWon = Boolean(
    effectiveOutcome &&
      userId &&
      effectiveOutcome.winner !== 'tie' &&
      ((effectiveOutcome.winner === 'challenger' && youCh) ||
        (effectiveOutcome.winner === 'opponent' && youOp)),
  )
  const youLost = Boolean(
    effectiveOutcome &&
      userId &&
      effectiveOutcome.winner !== 'tie' &&
      ((effectiveOutcome.winner === 'challenger' && youOp) ||
        (effectiveOutcome.winner === 'opponent' && youCh)),
  )

  const isTie = effectiveOutcome?.winner === 'tie'

  let headL = 'Challenge'
  let headR = formatShortDate(ch.createdAt) || formatShortDate(ch.expiresAt)
  if (life === 'complete') {
    headL = 'Challenge result'
    headR = formatShortDate(ch.createdAt)
  } else if (life === 'partial') {
    headL = 'Challenge in progress'
    headR = ch.createdAt ? `Sent ${formatShortDate(ch.createdAt)}` : headR
  }

  const borderWin = life === 'complete' && youWon
  const showProgress = life === 'complete' && effectiveOutcome != null
  const totalReps = effectiveOutcome
    ? Math.max(1, effectiveOutcome.challengerPushups + effectiveOutcome.opponentPushups)
    : 1
  const pctCh = effectiveOutcome ? (100 * effectiveOutcome.challengerPushups) / totalReps : 50

  const w = effectiveOutcome?.winner
  const diff =
    effectiveOutcome != null
      ? Math.abs(effectiveOutcome.challengerPushups - effectiveOutcome.opponentPushups)
      : 0

  let chSubComplete: ReactNode = null
  let opSubComplete: ReactNode = null
  if (life === 'complete' && effectiveOutcome) {
    if (isTie) {
      chSubComplete = 'Tie'
      opSubComplete = 'Tie'
    } else if (w === 'challenger') {
      chSubComplete = <span className="cd-fighter__sub--ok">Winner</span>
      opSubComplete =
        youOp && diff > 0 ? <span>−{diff} reps</span> : diff > 0 ? <span>+{diff} rep margin</span> : null
    } else if (w === 'opponent') {
      opSubComplete = <span className="cd-fighter__sub--ok">Winner</span>
      chSubComplete =
        youCh && diff > 0 ? <span>−{diff} reps</span> : diff > 0 ? <span>+{diff} rep margin</span> : null
    }
  }

  const chDim = life === 'complete' && w === 'opponent' && !isTie
  const opDim = life === 'complete' && w === 'challenger' && !isTie

  let centerArrow: 'left' | 'right' | null = null
  let arrowClass = 'cd-vs__arrow'
  if (life === 'complete' && effectiveOutcome && !isTie) {
    centerArrow = w === 'challenger' ? 'left' : 'right'
    arrowClass += youWon ? ' cd-vs__arrow--win' : ' cd-vs__arrow--lose'
  }

  const pl = youLost ? 'cd-progress__l cd-progress__l--lose' : 'cd-progress__l'
  const pr = youLost ? 'cd-progress__r cd-progress__r--lose' : 'cd-progress__r'

  const otherName = youCh ? ch.opponentName : ch.challengerName

  const chRecorded = a != null
  const opRecorded = b != null
  const chSubPartial =
    chRecorded ? (
      <span className="cd-fighter__sub--ok">✓ Recorded</span>
    ) : (
      <span className="cd-fighter__sub--warn">Not yet recorded</span>
    )
  const opSubPartial = opRecorded ? (
    <span className="cd-fighter__sub--ok">✓ Recorded</span>
  ) : (
    <span className="cd-fighter__sub--warn">Not yet recorded</span>
  )

  let toBeatLabel = ''
  let toBeatValue = ''
  if (life === 'partial' && a != null && b == null) {
    if (youCh) {
      toBeatLabel = 'To beat you, they need'
      toBeatValue = `${a + 1}+ reps`
    } else {
      toBeatLabel = 'To win, you need'
      toBeatValue = `${a + 1}+ reps`
    }
  } else if (life === 'partial' && b != null && a == null) {
    if (youOp) {
      toBeatLabel = 'To beat you, they need'
      toBeatValue = `${b + 1}+ reps`
    } else {
      toBeatLabel = 'To win, you need'
      toBeatValue = `${b + 1}+ reps`
    }
  }

  return (
    <div className="cd-page">
      <div className="cd-page__inner">
        {actionError ? (
          <p className="banner banner-error" role="alert" style={{ marginBottom: 16 }}>
            {actionError}
          </p>
        ) : null}

        {giftedFreeAcceptCelebration && !proposed ? (
          <div className="challenge-gift-accept-hero" style={{ marginBottom: '1.25rem' }}>
            <div className="challenge-gift-accept-hero__ico" aria-hidden>
              ✓
            </div>
            <h2>Challenge accepted</h2>
            <p>
              You accepted for free — {ch.challengerName} covered your entry. Now record your set and see who wins.
            </p>
            <Link
              className="btn btn-primary"
              to={`/c/${ch.id}/submit`}
              style={{ marginBottom: 8, background: '#4caf50', borderColor: '#4caf50', color: '#fff' }}
            >
              Record my set →
            </Link>
            <button type="button" className="btn btn-ghost" onClick={() => setGiftedFreeAcceptCelebration(false)}>
              Dismiss
            </button>
          </div>
        ) : null}

        {proposed && !isSignedIn ? (
          <p className="banner" role="status" style={{ marginBottom: 16 }}>
            Sign in to accept or decline this challenge.
          </p>
        ) : null}

        {proposed && isSignedIn && opponentCanRespond && ch.gifted === true ? (
          <div className="challenge-gift-card">
            <div className="challenge-gift-card__head">
              <span className="challenge-gift-card__head-l">Challenge from {ch.challengerName}</span>
              <span className="challenge-gift-card__head-r">Expires in {hoursLeftLabel(ch.expiresAt)}</span>
            </div>
            <div className="challenge-gift-card__body">
              <div className="challenge-gift-row">
                <div
                  className="challenge-gift-avatar"
                  style={{ background: avatarBg(ch.challengerName) }}
                  aria-hidden
                >
                  {ch.challengerName.charAt(0).toUpperCase()}
                </div>
                <div className="challenge-gift-row__text">
                  <p className="challenge-gift-row__name">{ch.challengerName}</p>
                  <p className="challenge-gift-row__meta">Challenger</p>
                </div>
                <span className="challenge-gift-badge">✓ Entry covered</span>
              </div>
              {typeof ch.challengerPushups === 'number' ? (
                <p style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 1rem', color: '#fff' }}>
                  {ch.challengerPushups} reps
                </p>
              ) : null}
              <div className="challenge-gift-free">
                <div className="challenge-gift-free__ico" aria-hidden>
                  ★
                </div>
                <div>
                  <p className="challenge-gift-free__title">Free to accept — {ch.challengerName} covered your entry</p>
                  <p className="challenge-gift-free__sub">No credits will be deducted from your account</p>
                </div>
              </div>
              <div className="challenge-gift-actions">
                <button
                  type="button"
                  className="btn btn-primary btn--accept-free"
                  disabled={busy}
                  onClick={() => void onAccept()}
                >
                  Accept challenge →
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn--decline-ghost"
                  disabled={busy}
                  onClick={() => void onDecline()}
                >
                  Decline
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {proposed && isSignedIn && opponentCanRespond && ch.gifted !== true ? (
          <>
            <p className="challenge-std-accept-hint">Accepting uses 1 credit from your balance (standard challenge).</p>
            <div className="actions wrap" style={{ marginBottom: 16 }}>
              <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void onAccept()}>
                Accept challenge
              </button>
              <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => void onDecline()}>
                Decline
              </button>
            </div>
          </>
        ) : null}

        {proposed && isSignedIn && challengerView ? (
          <div className="actions wrap" style={{ marginBottom: 16 }}>
            <p className="muted" style={{ margin: 0, flex: '1 1 200px' }}>
              Waiting for your opponent to accept.
            </p>
            <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => void onCancel()}>
              Cancel invite
            </button>
          </div>
        ) : null}

        {proposed && isSignedIn && !challengerView && !opponentCanRespond ? (
          <p className="muted" style={{ marginBottom: 16 }}>
            You’re not the invited opponent for this challenge.
          </p>
        ) : null}

        {proposed && !isSignedIn ? (
          <div className="actions wrap" style={{ marginBottom: 16 }}>
            <SignInButton mode="modal" forceRedirectUrl={shareUrl}>
              <button type="button" className="btn btn-primary">
                Sign in
              </button>
            </SignInButton>
          </div>
        ) : null}

        {terminal ? (
          <div className="cd-terminal" role="status">
            {st === 'declined' && 'This challenge was declined.'}
            {st === 'cancelled' && 'This challenge was cancelled.'}
            {st === 'expired' && 'This challenge has expired.'}
          </div>
        ) : null}

        {!terminal && (
          <>
            {proposed && <div className="cd-tag cd-tag--proposed">Awaiting acceptance</div>}
            {!proposed && life === 'complete' && <div className="cd-tag cd-tag--complete">Complete</div>}
            {!proposed && life === 'partial' && (
              <div className="cd-tag cd-tag--pending">
                <span className="cd-tag--dot" aria-hidden />
                Waiting for opponent
              </div>
            )}
            {!proposed && life === 'pending' && (
              <div className="cd-tag cd-tag--complete">In progress</div>
            )}

            <div className={`cd-arena${borderWin ? ' cd-arena--win' : ''}`}>
              <div className="cd-arena__head">
                <span className="cd-arena__head-l">{headL}</span>
                <span className="cd-arena__head-r">{headR}</span>
              </div>
              <div className="cd-arena__body">
                <FighterCol
                  name={ch.challengerName}
                  you={youCh}
                  score={a}
                  showDash={a == null}
                  dimScore={chDim}
                  sub={life === 'complete' ? chSubComplete : life === 'partial' ? chSubPartial : null}
                />
                <div className="cd-vs">
                  {centerArrow ? (
                    <span className={arrowClass} aria-hidden>
                      {centerArrow === 'left' ? '◀' : '▶'}
                    </span>
                  ) : null}
                  <span className="cd-vs__label">VS</span>
                </div>
                <FighterCol
                  name={ch.opponentName}
                  you={youOp}
                  score={b}
                  showDash={b == null}
                  dimScore={opDim}
                  sub={life === 'complete' ? opSubComplete : life === 'partial' ? opSubPartial : null}
                />
              </div>
              {showProgress && effectiveOutcome ? (
                <div className="cd-progress-wrap">
                  <div className="cd-progress">
                    <div className={pl} style={{ width: `${pctCh}%` }} />
                    <div className={pr} style={{ width: `${100 - pctCh}%` }} />
                  </div>
                  <div className="cd-progress-labels">
                    <span>{ch.challengerName}</span>
                    <span>{ch.opponentName}</span>
                  </div>
                </div>
              ) : null}
            </div>

            {life === 'partial' && (
              <div className="cd-info" role="region" aria-label="Challenge status">
                <div className="cd-info__row">
                  <span
                    className="cd-info__dot"
                    style={{
                      background:
                        (youCh && chRecorded) || (youOp && opRecorded) ? '#4CAF50' : 'rgba(255,255,255,0.2)',
                    }}
                  />
                  <span className="cd-info__l">Your score</span>
                  <span
                    className="cd-info__v"
                    style={{
                      color:
                        (youCh && chRecorded) || (youOp && opRecorded)
                          ? '#4CAF50'
                          : 'rgba(255,255,255,0.5)',
                    }}
                  >
                    {youCh
                      ? chRecorded
                        ? `${a} reps — recorded`
                        : '—'
                      : youOp
                        ? opRecorded
                          ? `${b} reps — recorded`
                          : '—'
                        : '—'}
                  </span>
                </div>
                <div className="cd-info__row">
                  <span className="cd-info__dot" style={{ background: '#FFC107' }} />
                  <span className="cd-info__l">Opponent status</span>
                  <span className="cd-info__v" style={{ color: '#FFC107' }}>
                    {youCh
                      ? opRecorded
                        ? 'Recorded'
                        : "Hasn't recorded yet"
                      : youOp
                        ? chRecorded
                          ? 'Recorded'
                          : "Hasn't recorded yet"
                        : "Hasn't recorded yet"}
                  </span>
                </div>
                <div className="cd-info__row">
                  <span className="cd-info__dot" style={{ background: 'rgba(255,255,255,0.25)' }} />
                  <span className="cd-info__l">Challenge expires</span>
                  <span className="cd-info__v">{ch.expiresAt ? hoursLeftLabel(ch.expiresAt) + ' left' : '48h from sent'}</span>
                </div>
                {toBeatValue ? (
                  <div className="cd-info__row">
                    <span className="cd-info__dot" style={{ background: '#FF5722' }} />
                    <span className="cd-info__l">{toBeatLabel}</span>
                    <span className="cd-info__v" style={{ color: '#FF5722' }}>
                      {toBeatValue}
                    </span>
                  </div>
                ) : null}
              </div>
            )}

            {life === 'complete' && effectiveOutcome && (
              <>
                {isTie ? (
                  <div className="cd-banner cd-banner--tie">
                    <div className="cd-banner__ico cd-banner__ico--lose" aria-hidden>
                      =
                    </div>
                    <div className="cd-banner__body">
                      <p className="cd-banner__title" style={{ color: 'rgba(255,255,255,0.85)' }}>
                        It&apos;s a tie
                      </p>
                      <p className="cd-banner__sub">Both at {effectiveOutcome.challengerPushups} reps.</p>
                    </div>
                  </div>
                ) : youWon ? (
                  <div className="cd-banner cd-banner--win">
                    <div className="cd-banner__ico cd-banner__ico--win" aria-hidden>
                      ★
                    </div>
                    <div className="cd-banner__body">
                      <p className="cd-banner__title cd-banner__title--win">You won</p>
                      <p className="cd-banner__sub">
                        Defeated {otherName} by {diff} {diff === 1 ? 'rep' : 'reps'}. Your ranking will update when
                        rankings are available.
                      </p>
                    </div>
                    <span className="cd-banner__side cd-banner__side--win">+{diff}</span>
                  </div>
                ) : youLost && userId ? (
                  <div className="cd-banner cd-banner--lose">
                    <div className="cd-banner__ico cd-banner__ico--lose" aria-hidden>
                      ✕
                    </div>
                    <div className="cd-banner__body">
                      <p className="cd-banner__title cd-banner__title--lose">You lost</p>
                      <p className="cd-banner__sub">
                        {otherName} beat you by {diff} {diff === 1 ? 'rep' : 'reps'}. You need{' '}
                        <strong>
                          {youCh
                            ? b != null
                              ? b + 1
                              : '—'
                            : a != null
                              ? a + 1
                              : '—'}
                        </strong>
                        + reps to beat their score in a rematch.
                      </p>
                    </div>
                    <span className="cd-banner__side cd-banner__side--lose">−{diff}</span>
                  </div>
                ) : (
                  <div className="cd-banner cd-banner--tie">
                    <div className="cd-banner__body">
                      <p className="cd-banner__title" style={{ color: 'rgba(255,255,255,0.85)' }}>
                        {w === 'challenger' ? ch.challengerName : ch.opponentName} wins
                      </p>
                      <p className="cd-banner__sub">Final scores are in.</p>
                    </div>
                  </div>
                )}

                <div className="cd-actions">
                  {youWon ? (
                    <>
                      <Link className="cd-btn cd-btn--ghost" to="/challenge">
                        Rematch
                      </Link>
                      <Link className="cd-btn cd-btn--primary" to="/challenge">
                        Challenge someone else →
                      </Link>
                    </>
                  ) : youLost && userId ? (
                    <>
                      <Link className="cd-btn cd-btn--ghost" to="/challenge">
                        Challenge someone else
                      </Link>
                      <Link className="cd-btn cd-btn--primary" to="/challenge">
                        Rematch →
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link className="cd-btn cd-btn--ghost" to="/challenge">
                        Rematch
                      </Link>
                      <Link className="cd-btn cd-btn--primary" to="/challenge">
                        New challenge
                      </Link>
                    </>
                  )}
                </div>
                <div className="cd-actions">
                  <button type="button" className="cd-btn cd-btn--ghost" onClick={() => void shareLink()}>
                    Share result
                  </button>
                  <button type="button" className="cd-btn cd-btn--ghost" onClick={() => void copyLink()}>
                    Copy challenge link
                  </button>
                </div>
              </>
            )}

            {life === 'partial' && (
              <div className="cd-actions" style={{ marginTop: 8 }}>
                <button type="button" className="cd-btn cd-btn--ghost" onClick={() => void copyLink()}>
                  Copy challenge link
                </button>
                <button type="button" className="cd-btn cd-btn--primary" onClick={() => void shareLink()}>
                  Share with opponent →
                </button>
                {(youCh && !chRecorded) || (youOp && !opRecorded) ? (
                  <Link className="cd-btn cd-btn--primary" to={`/c/${ch.id}/submit`} style={{ flex: '1 1 100%' }}>
                    Log your reps
                  </Link>
                ) : null}
              </div>
            )}

            {showLogReps && life === 'pending' && (
              <div className="cd-actions" style={{ marginTop: 8 }}>
                <button type="button" className="cd-btn cd-btn--ghost" onClick={() => void copyLink()}>
                  Copy challenge link
                </button>
                <Link className="cd-btn cd-btn--primary" to={`/c/${ch.id}/submit`}>
                  Log reps
                </Link>
              </div>
            )}
          </>
        )}

        {isSignedIn ? (
          <Link to="/my-challenges" className="cd-link-quiet">
            View all my challenges
          </Link>
        ) : null}
      </div>
    </div>
  )
}

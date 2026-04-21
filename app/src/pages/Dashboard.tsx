import { useAuth, useUser } from '@clerk/react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { fetchCreditBalance } from '../api/billing'
import { fetchMyChallenges, getLeaderboard } from '../api/challenges'
import { fetchSoloSessions } from '../api/solo'
import { fetchMyChallengeRecord } from '../api/users'
import { countActiveChallenges } from '../lib/challengeParticipation'
import { formatError } from '../lib/formatError'
import { getLifecycle } from '../lib/challengeLifecycle'
import type { Challenge, LeaderboardEntry } from '../types/challenge'

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function startOfCalendarWeek(d: Date): Date {
  const x = new Date(d)
  const wd = x.getDay()
  const offset = wd === 0 ? -6 : 1 - wd
  x.setDate(x.getDate() + offset)
  x.setHours(0, 0, 0, 0)
  return x
}

function greetingForHour(h: number): string {
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0]![0]! + parts[1]![0]!).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase() || '?'
}

function challengeDashBadge(
  ch: Challenge,
  userId: string | undefined,
): { label: string; className: string } {
  const st = (ch.status ?? '').toLowerCase()
  const life = getLifecycle(ch)
  if (st === 'proposed') return { label: 'Pending', className: 'dash__badge--pending' }
  if (life === 'complete') {
    const challengerId = (ch.challengerClerkUserId ?? '').trim()
    const isUserChallenger = !!userId && userId === challengerId
    const mine = isUserChallenger ? ch.challengerPushups : ch.opponentPushups
    const theirs = isUserChallenger ? ch.opponentPushups : ch.challengerPushups
    if (mine != null && theirs != null) {
      if (mine > theirs) return { label: 'Won', className: 'dash__badge--won' }
      if (mine < theirs) return { label: 'Lost', className: 'dash__badge--lost' }
      return { label: 'Tie', className: 'dash__badge--tie' }
    }
  }
  if (st === 'active' || life === 'partial') {
    return { label: 'Live', className: 'dash__badge--live' }
  }
  return { label: st || '—', className: 'dash__badge--muted' }
}

function challengeRowTitle(ch: Challenge, userId: string | undefined): string {
  const challengerId = (ch.challengerClerkUserId ?? '').trim()
  const isUserChallenger = !!userId && userId === challengerId
  return isUserChallenger
    ? `vs ${ch.opponentName}`
    : `vs ${ch.challengerName}`
}

function rowSubtitle(ch: Challenge): string {
  const st = (ch.status ?? '').toLowerCase()
  const life = getLifecycle(ch)
  if (st === 'declined') return 'Declined'
  if (st === 'cancelled') return 'Cancelled'
  if (st === 'expired') return 'Expired'
  if (st === 'proposed') return 'Awaiting acceptance'
  if (life === 'complete') return 'Complete'
  if (life === 'partial') return 'In progress'
  return 'No scores yet'
}

/**
 * Best-effort rank from public leaderboard: matches Clerk profile name to
 * `LeaderboardEntry.displayName` (case-insensitive). Wrong if names differ, user is
 * unranked, or API data is stale.
 */
function heuristicRank(
  leaderboard: LeaderboardEntry[] | null,
  namesToTry: string[],
): string | null {
  if (!leaderboard?.length) return null
  const tries = new Set(namesToTry.map((n) => n.trim().toLowerCase()).filter(Boolean))
  for (const row of leaderboard) {
    const dn = (row.displayName ?? '').trim().toLowerCase()
    if (dn && tries.has(dn)) {
      return `#${row.rank}`
    }
  }
  return null
}

export function Dashboard() {
  const { user } = useUser()
  const { getToken } = useAuth()
  const userId = user?.id

  const displayName =
    user?.fullName?.trim() ||
    [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() ||
    user?.username ||
    'there'

  const hour = new Date().getHours()
  const greeting = greetingForHour(hour)

  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [record, setRecord] = useState<{ wins: number; losses: number; ties: number } | null>(
    null,
  )
  const [sessions, setSessions] = useState<Awaited<ReturnType<typeof fetchSoloSessions>>>([])
  const [credits, setCredits] = useState<number | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const [chList, rec, solo, bal, board] = await Promise.all([
          fetchMyChallenges(getToken),
          fetchMyChallengeRecord(getToken),
          fetchSoloSessions(getToken),
          fetchCreditBalance(getToken),
          getLeaderboard(),
        ])
        if (cancelled) return
        setChallenges(chList)
        setRecord(rec)
        setSessions(solo)
        setCredits(bal)
        setLeaderboard(board)
      } catch (e) {
        if (!cancelled) {
          setError(formatError(e))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [getToken])

  const activeCount = useMemo(() => countActiveChallenges(challenges, userId), [challenges, userId])

  const winRate = useMemo(() => {
    if (!record) return null
    const total = record.wins + record.losses + record.ties
    if (total === 0) return null
    return Math.round((record.wins / total) * 100)
  }, [record])

  const { totalReps, bestReps } = useMemo(() => {
    let total = 0
    let best = 0
    for (const s of sessions) {
      total += s.reps
      if (s.reps > best) best = s.reps
    }
    return { totalReps: total, bestReps: best }
  }, [sessions])

  const chartBuckets = useMemo(() => {
    const buckets = [0, 0, 0, 0, 0, 0, 0]
    const start = startOfCalendarWeek(new Date())
    for (const s of sessions) {
      const t = new Date(s.createdAt)
      if (t < start) continue
      buckets[t.getDay()] += s.reps
    }
    return buckets
  }, [sessions])

  const todayDow = new Date().getDay()
  const maxBucket = Math.max(1, ...chartBuckets)

  const rankLabel = useMemo(() => {
    const names = [
      user?.fullName ?? '',
      [user?.firstName, user?.lastName].filter(Boolean).join(' '),
      user?.firstName ?? '',
      user?.username ?? '',
    ]
    return heuristicRank(leaderboard, names)
  }, [leaderboard, user])

  const challengePreview = useMemo(() => challenges.slice(0, 6), [challenges])

  if (loading) {
    return <p className="dash__muted">Loading your dashboard…</p>
  }

  return (
    <div className="dash">
      {error ? (
        <p className="banner banner-error" role="alert" style={{ marginBottom: '1rem' }}>
          {error}
        </p>
      ) : null}

      <header className="dash__header">
        <div className="dash__greeting">
          <h1 className="dash__title">
            {greeting}, {displayName}
          </h1>
          <p className="dash__subtitle">
            {activeCount === 0
              ? 'No active challenges right now.'
              : `${activeCount} active challenge${activeCount === 1 ? '' : 's'}`}
          </p>
        </div>
        <div className="dash__actions">
          <Link className="dash__btn-ghost dash__btn-ghost--solo" to="/solo">
            Solo session
          </Link>
          <Link className="dash__btn-primary" to="/challenge/create">
            + New challenge
          </Link>
        </div>
      </header>

      <section className="dash__stats" aria-label="Stats">
        <div className="dash__stat">
          <div className="dash__stat-label">Win rate</div>
          <div className="dash__stat-value">{winRate == null ? '—' : `${winRate}%`}</div>
          {record ? (
            <div className="dash__stat-hint">
              {record.wins}W · {record.losses}L · {record.ties}T
            </div>
          ) : null}
        </div>
        <div className="dash__stat">
          <div className="dash__stat-label">Solo reps</div>
          <div className="dash__stat-value">{totalReps}</div>
          <div className="dash__stat-hint">Best set: {bestReps || '—'}</div>
        </div>
        <div className="dash__stat">
          <div className="dash__stat-label">Credits</div>
          <div className="dash__stat-value">{credits ?? '—'}</div>
          <div className="dash__stat-hint">
            <Link to="/credits" style={{ color: 'inherit' }}>
              Buy more
            </Link>
          </div>
        </div>
        <div className="dash__stat">
          <div className="dash__stat-label">Global rank</div>
          <div className="dash__stat-value">{rankLabel ?? '—'}</div>
          <div className="dash__stat-hint">Heuristic · leaderboard name match</div>
        </div>
      </section>

      <div className="dash__mid">
        <section className="dash__panel" aria-label="Challenges">
          <h2 className="dash__panel-title">Challenges</h2>
          {challengePreview.length === 0 ? (
            <p className="dash__muted">No challenges yet. Start one from the Challenge flow.</p>
          ) : (
            challengePreview.map((ch) => {
              const badge = challengeDashBadge(ch, userId)
              const oppInitials = initialsFromName(
                (userId && (ch.challengerClerkUserId ?? '').trim() === userId
                  ? ch.opponentName
                  : ch.challengerName) || 'Opponent',
              )
              return (
                <Link key={ch.id} className="dash__challenge-row" to={`/c/${ch.id}`}>
                  <div className="dash__avatar" aria-hidden>
                    {oppInitials}
                  </div>
                  <div className="dash__challenge-body">
                    <div className="dash__challenge-title">{challengeRowTitle(ch, userId)}</div>
                    <div className="dash__challenge-meta">{rowSubtitle(ch)}</div>
                  </div>
                  <span className={`dash__badge ${badge.className}`}>{badge.label}</span>
                </Link>
              )
            })
          )}
          {challenges.length > 6 ? (
            <p className="dash__muted" style={{ marginTop: '0.75rem' }}>
              <Link to="/my-challenges">View all challenges</Link>
            </p>
          ) : null}
        </section>

        <section className="dash__panel" aria-label="Weekly reps">
          <h2 className="dash__panel-title">This week (solo)</h2>
          <div className="dash__chart" role="img" aria-label="Reps by weekday">
            {chartBuckets.map((val, i) => (
              <div key={WEEKDAY_LABELS[i]} className="dash__chart-bar-wrap">
                <div
                  className={`dash__chart-bar ${i === todayDow ? 'dash__chart-bar--today' : ''}`}
                  style={{ height: `${Math.max(8, (val / maxBucket) * 100)}%` }}
                  title={`${WEEKDAY_LABELS[i]}: ${val} reps`}
                />
                <span className="dash__chart-day">{WEEKDAY_LABELS[i]}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="dash__activity dash__panel" aria-label="Activity">
        <h2 className="dash__panel-title">Activity</h2>
        <p className="dash__activity-placeholder">
          No activity feed yet. A future GET /users/activity endpoint will populate this panel.
        </p>
      </section>

      <section aria-label="Quick actions">
        <h2 className="dash__panel-title" style={{ marginBottom: '0.75rem' }}>
          Quick actions
        </h2>
        <div className="dash__quick">
          <Link className="dash__quick-card" to="/challenge/create">
            New challenge
          </Link>
          <Link className="dash__quick-card" to="/solo">
            Solo session
          </Link>
          <Link className="dash__quick-card" to="/leaderboard">
            Leaderboard
          </Link>
        </div>
      </section>
    </div>
  )
}

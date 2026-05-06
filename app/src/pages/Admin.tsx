import { useAuth } from '@clerk/react'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import {
  adminGetLeaderboard,
  adminGrantCredits,
  adminLookupUsers,
  adminUserChallengeVideos,
  adminUserChallenges,
  adminUserFriends,
  adminUserProfile,
  adminUserSoloSessions,
  type AdminSoloSessionItem,
  type AdminUserProfile,
  type AdminUserSearchItem,
} from '../api/admin'
import type { FriendOut } from '../api/friends'
import { formatError } from '../lib/formatError'
import { PageLoading } from '../components/ui/PageLoading'
import type { Challenge, ChallengeVideoItem, LeaderboardEntry } from '../types/challenge'

export function Admin() {
  const { getToken } = useAuth()
  const [q, setQ] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchHits, setSearchHits] = useState<AdminUserSearchItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [targetId, setTargetId] = useState<string | null>(null)
  const [profile, setProfile] = useState<AdminUserProfile | null>(null)
  const [friends, setFriends] = useState<FriendOut[] | null>(null)
  const [challenges, setChallenges] = useState<Challenge[] | null>(null)
  const [cVideos, setCVideos] = useState<ChallengeVideoItem[] | null>(null)
  const [solos, setSolos] = useState<AdminSoloSessionItem[] | null>(null)
  const [loadingUser, setLoadingUser] = useState(false)
  const [creditsN, setCreditsN] = useState('10')
  const [creditsReason, setCreditsReason] = useState('Support')
  const [creditsBusy, setCreditsBusy] = useState(false)

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[] | null>(null)
  const [leaderboardLoading, setLeaderboardLoading] = useState(true)
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLeaderboardLoading(true)
    setLeaderboardError(null)
    void adminGetLeaderboard(getToken)
      .then((rows) => {
        if (!cancelled) setLeaderboard(rows)
      })
      .catch((e) => {
        if (!cancelled) {
          setLeaderboardError(formatError(e))
          setLeaderboard(null)
        }
      })
      .finally(() => {
        if (!cancelled) setLeaderboardLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [getToken])

  const onSearch = useCallback(async () => {
    setError(null)
    const t = q.trim()
    if (t.length < 2) {
      setError('Enter at least 2 characters.')
      return
    }
    setSearching(true)
    try {
      const rows = await adminLookupUsers(getToken, t)
      setSearchHits(rows)
    } catch (e) {
      setError(formatError(e))
      setSearchHits([])
    } finally {
      setSearching(false)
    }
  }, [getToken, q])

  const loadUser = useCallback(
    async (clerkUserId: string) => {
      setError(null)
      setTargetId(clerkUserId)
      setLoadingUser(true)
      setProfile(null)
      setFriends(null)
      setChallenges(null)
      setCVideos(null)
      setSolos(null)
      try {
        const [p, f, c, v, s] = await Promise.all([
          adminUserProfile(getToken, clerkUserId),
          adminUserFriends(getToken, clerkUserId),
          adminUserChallenges(getToken, clerkUserId),
          adminUserChallengeVideos(getToken, clerkUserId),
          adminUserSoloSessions(getToken, clerkUserId),
        ])
        setProfile(p)
        setFriends(f)
        setChallenges(c)
        setCVideos(v)
        setSolos(s)
      } catch (e) {
        setError(formatError(e))
      } finally {
        setLoadingUser(false)
      }
    },
    [getToken],
  )

  const onGrant = useCallback(async () => {
    if (!targetId) return
    setError(null)
    const n = Number.parseInt(creditsN, 10)
    if (Number.isNaN(n) || n === 0) {
      setError('Enter a non-zero integer for credits.')
      return
    }
    const reason = creditsReason.trim()
    if (!reason) {
      setError('Enter a reason for the ledger.')
      return
    }
    setCreditsBusy(true)
    try {
      const out = await adminGrantCredits(getToken, targetId, n, reason)
      setProfile((prev) => (prev ? { ...prev, creditBalance: out.newBalance } : prev))
    } catch (e) {
      setError(formatError(e))
    } finally {
      setCreditsBusy(false)
    }
  }, [creditsN, creditsReason, getToken, targetId])

  return (
    <section className="stack narrow">
      <p className="muted" style={{ marginBottom: 0 }}>
        <Link to="/dashboard">← Dashboard</Link>
      </p>
      <h1 className="page-title">Admin</h1>
      <p className="lede">Search users, inspect activity, and adjust credits (allowlisted accounts only).</p>

      <div className="card stack" style={{ marginTop: '1rem' }}>
        <h2 className="page-title" style={{ fontSize: '1.1rem', margin: 0 }}>
          Leaderboard (admin)
        </h2>
        <p className="muted" style={{ margin: 0 }}>
          Rankings from completed challenges: wins, then losses (fewer is better), ties, then best reps in a single
          game.
        </p>
        {leaderboardLoading ? (
          <PageLoading layout="inline" message="Loading leaderboard…" messageClassName="muted" />
        ) : null}
        {leaderboardError ? (
          <p className="banner banner-error" role="alert" style={{ marginBottom: 0 }}>
            {leaderboardError}
          </p>
        ) : null}
        {!leaderboardLoading && leaderboard && leaderboard.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '8px 6px', borderBottom: '1px solid var(--border, #2a3140)' }}>
                    Rank
                  </th>
                  <th style={{ textAlign: 'left', padding: '8px 6px', borderBottom: '1px solid var(--border, #2a3140)' }}>
                    Display name
                  </th>
                  <th style={{ textAlign: 'right', padding: '8px 6px', borderBottom: '1px solid var(--border, #2a3140)' }}>
                    W
                  </th>
                  <th style={{ textAlign: 'right', padding: '8px 6px', borderBottom: '1px solid var(--border, #2a3140)' }}>
                    T
                  </th>
                  <th style={{ textAlign: 'right', padding: '8px 6px', borderBottom: '1px solid var(--border, #2a3140)' }}>
                    L
                  </th>
                  <th style={{ textAlign: 'right', padding: '8px 6px', borderBottom: '1px solid var(--border, #2a3140)' }}>
                    Best reps
                  </th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((row) => (
                  <tr key={`${row.rank}-${row.displayName}`}>
                    <td style={{ padding: '6px', borderBottom: '1px solid var(--border, #2a3140)' }}>{row.rank}</td>
                    <td style={{ padding: '6px', borderBottom: '1px solid var(--border, #2a3140)' }}>
                      {row.displayName}
                    </td>
                    <td style={{ padding: '6px', textAlign: 'right', borderBottom: '1px solid var(--border, #2a3140)' }}>
                      {row.wins}
                    </td>
                    <td style={{ padding: '6px', textAlign: 'right', borderBottom: '1px solid var(--border, #2a3140)' }}>
                      {row.ties}
                    </td>
                    <td style={{ padding: '6px', textAlign: 'right', borderBottom: '1px solid var(--border, #2a3140)' }}>
                      {row.losses}
                    </td>
                    <td style={{ padding: '6px', textAlign: 'right', borderBottom: '1px solid var(--border, #2a3140)' }}>
                      {row.bestPushups}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        {!leaderboardLoading && leaderboard?.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            No entries yet.
          </p>
        ) : null}
      </div>

      {error ? (
        <p className="banner banner-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="card form stack">
        <p className="muted" style={{ margin: 0 }}>
          User lookup
        </p>
        <div className="actions wrap" style={{ alignItems: 'flex-end' }}>
          <label className="field" style={{ flex: '1 1 240px', marginBottom: 0 }}>
            <span>Email, display name, or Clerk id</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void onSearch()}
              placeholder="min. 2 characters"
              autoComplete="off"
            />
          </label>
          <button type="button" className="btn btn-primary" disabled={searching} onClick={() => void onSearch()}>
            {searching ? 'Searching…' : 'Search'}
          </button>
        </div>
        {searchHits.length > 0 ? (
          <ul className="stack" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {searchHits.map((h) => (
              <li key={h.clerkUserId}>
                <button
                  type="button"
                  className="btn"
                  style={{ width: '100%', textAlign: 'left' }}
                  onClick={() => void loadUser(h.clerkUserId)}
                >
                  <strong>{h.displayName || '—'}</strong>
                  <span className="muted" style={{ display: 'block', fontSize: '0.85rem' }}>
                    {h.email || 'no email'} · {h.clerkUserId}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {targetId && loadingUser ? (
        <PageLoading layout="inline" message="Loading user…" messageClassName="muted" />
      ) : null}

      {profile ? (
        <div className="card stack" style={{ marginTop: '1rem' }}>
          <h2 className="page-title" style={{ fontSize: '1.1rem', margin: 0 }}>
            {profile.displayName || 'User'}
          </h2>
          <p className="muted" style={{ margin: 0 }}>
            {profile.email || '—'} · {profile.clerkUserId}
          </p>
          <p style={{ margin: 0 }}>
            <strong>{profile.creditBalance}</strong> credits · <strong>{profile.challengeCount}</strong> challenges
            (involving)
          </p>

          <div
            className="stack"
            style={{
              borderTop: '1px solid var(--border, #2a3140)',
              paddingTop: '12px',
            }}
          >
            <h3 style={{ fontSize: '0.95rem', margin: 0 }}>Adjust credits</h3>
            <div className="actions wrap" style={{ alignItems: 'flex-end' }}>
              <label className="field" style={{ maxWidth: '120px' }}>
                <span>Delta (+/−)</span>
                <input
                  value={creditsN}
                  onChange={(e) => setCreditsN(e.target.value)}
                  inputMode="numeric"
                />
              </label>
              <label className="field" style={{ flex: 1, minWidth: 0 }}>
                <span>Reason (audit)</span>
                <input value={creditsReason} onChange={(e) => setCreditsReason(e.target.value)} />
              </label>
              <button
                type="button"
                className="btn btn-primary"
                disabled={creditsBusy}
                onClick={() => void onGrant()}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {friends && targetId ? (
        <div className="card stack" style={{ marginTop: '1rem' }}>
          <h3 style={{ fontSize: '0.95rem', margin: 0 }}>Friends ({friends.length})</h3>
          {friends.length === 0 ? (
            <p className="muted">No friends.</p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
              {friends.map((f) => (
                <li key={f.clerkUserId}>
                  {f.displayName || f.clerkUserId} <span className="muted">({f.clerkUserId})</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {challenges && targetId ? (
        <div className="card stack" style={{ marginTop: '1rem' }}>
          <h3 style={{ fontSize: '0.95rem', margin: 0 }}>Challenges ({challenges.length})</h3>
          {challenges.length === 0 ? (
            <p className="muted">None.</p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
              {challenges.map((c) => (
                <li key={c.id}>
                  <Link to={`/c/${c.id}`}>
                    {c.challengerName} vs {c.opponentName}
                  </Link>{' '}
                  <span className="muted">({c.status || '—'})</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {cVideos && targetId ? (
        <div className="card stack" style={{ marginTop: '1rem' }}>
          <h3 style={{ fontSize: '0.95rem', margin: 0 }}>Challenge attempt videos ({cVideos.length})</h3>
          {cVideos.length === 0 ? (
            <p className="muted">None with video on file.</p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
              {cVideos.map((v) => (
                <li key={v.id}>
                  {v.opponent.username} ({v.role}) — {v.yourScore} vs {v.theirScore} ({v.result})
                  {v.videoUrl ? (
                    <>
                      {' '}
                      <a href={v.videoUrl} target="_blank" rel="noreferrer">
                        Open video
                      </a>
                    </>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {solos && targetId ? (
        <div className="card stack" style={{ marginTop: '1rem' }}>
          <h3 style={{ fontSize: '0.95rem', margin: 0 }}>Solo sessions (latest 100)</h3>
          {solos.length === 0 ? (
            <p className="muted">None.</p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
              {solos.map((s) => (
                <li key={s.sessionId}>
                  {s.reps} reps · {s.createdAt}
                  {s.videoUrl ? (
                    <>
                      {' '}
                      <a href={s.videoUrl} target="_blank" rel="noreferrer">
                        Video
                      </a>
                    </>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </section>
  )
}

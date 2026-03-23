import { useEffect, useState } from 'react'
import { getLeaderboard } from '../api/challenges'
import { isMockApiEnabled } from '../api/config'
import type { LeaderboardEntry } from '../types/challenge'
import { formatError } from '../lib/formatError'

const FALLBACK: LeaderboardEntry[] = [
  { rank: 1, displayName: 'Jamie', bestPushups: 62 },
  { rank: 2, displayName: 'Riley', bestPushups: 58 },
  { rank: 3, displayName: 'Sam', bestPushups: 51 },
]

export function Leaderboard() {
  const mock = isMockApiEnabled()
  const [rows, setRows] = useState<LeaderboardEntry[] | null>(mock ? FALLBACK : null)
  const [loading, setLoading] = useState(!mock)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (mock) return
    let cancelled = false
    void (async () => {
      await Promise.resolve()
      if (cancelled) return
      setLoading(true)
      setError(null)
      try {
        const r = await getLeaderboard()
        if (!cancelled) setRows(r)
      } catch (err) {
        if (!cancelled) {
          setError(formatError(err))
          setRows(FALLBACK)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [mock])

  return (
    <section className="stack narrow">
      <h1 className="page-title">Leaderboard</h1>
      <p className="lede">
        Placeholder leaderboard for future rankings. Live data will connect once
        the API endpoint is available.
      </p>

      {error ? (
        <p className="banner banner-warn" role="status">
          Could not load leaderboard from the API ({error}). Showing sample data.
        </p>
      ) : null}

      {loading ? <p className="muted">Loading…</p> : null}

      {!loading && rows ? (
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">Name</th>
                <th scope="col">Best</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.rank}>
                  <td>{row.rank}</td>
                  <td>{row.displayName}</td>
                  <td>{row.bestPushups}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  )
}

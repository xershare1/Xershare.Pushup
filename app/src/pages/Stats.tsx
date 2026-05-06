import { useAuth } from '@clerk/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { fetchStatsPage, type StatsPageModel, type StatsPeriod } from '../api/stats'
import { formatError } from '../lib/formatError'
import { StatsPageSkeleton } from '../components/ui/StatsPageSkeleton'

const PERIODS: { id: StatsPeriod; label: string }[] = [
  { id: '7d', label: '7 days' },
  { id: '30d', label: '30 days' },
  { id: '3mo', label: '3 months' },
  { id: 'all', label: 'All time' },
]

function formatSessionDate(iso: string): string {
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    const datePart = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    const timePart = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    return `${datePart} · ${timePart}`
  } catch {
    return iso
  }
}

function formatChallengeDate(iso: string): string {
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  } catch {
    return iso
  }
}

function formatSecs(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function trendTitle(mode: StatsPageModel['trendMode']): string {
  if (mode === '7d') return 'Rep trend — 7 days'
  if (mode === '12w') return 'Rep trend — 12 weeks'
  return 'Rep trend — 30 days'
}

export function Stats() {
  const { getToken } = useAuth()
  const [period, setPeriod] = useState<StatsPeriod>('30d')
  const [data, setData] = useState<StatsPageModel | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const m = await fetchStatsPage(getToken, period)
      setData(m)
    } catch (e) {
      setError(formatError(e))
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [getToken, period])

  useEffect(() => {
    void load()
  }, [load])

  const maxTrend = useMemo(() => {
    if (!data?.trendValues.length) return 1
    return Math.max(1, ...data.trendValues)
  }, [data])

  const headToHeadOverall = useMemo(() => {
    if (!data?.headToHead.length) return null
    let w = 0
    let l = 0
    for (const r of data.headToHead) {
      w += r.wins
      l += r.losses
    }
    return { wins: w, losses: l }
  }, [data])

  const deep = data?.deep

  return (
    <section className="stats-page">
      <Link to="/dashboard" className="stats-page__nudge">
        For today&apos;s snapshot and active challenges → <span className="stats-page__nudge-link">Dashboard ↗</span>
      </Link>

      <header className="stats-page__header">
        <h1 className="stats-page__title">Stats</h1>
        <p className="stats-page__subtitle">Deep dive into your performance over time.</p>
      </header>

      <div className="stats-page__periods" role="tablist" aria-label="Time period">
        {PERIODS.map((p) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={period === p.id}
            className={`stats-page__period${period === p.id ? ' stats-page__period--active' : ''}`}
            onClick={() => setPeriod(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {error ? (
        <p className="stats-page__banner stats-page__banner--error" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <div className="stats-page__loading-skeleton" role="status" aria-live="polite" aria-busy="true">
          <span className="app-sr-only">Loading…</span>
          <StatsPageSkeleton />
        </div>
      ) : null}

      {!loading && data && deep ? (
        <>
          <div className="stats-page__deep-grid">
            <div className="stats-page__deep-card">
              <div className="stats-page__deep-label">Improvement</div>
              <div className="stats-page__deep-value">+{deep.improvementReps}</div>
              <div className="stats-page__deep-sub stats-page__deep-sub--green">reps vs last month</div>
            </div>
            <div className="stats-page__deep-card">
              <div className="stats-page__deep-label">Longest streak</div>
              <div className="stats-page__deep-value">{deep.longestStreak}</div>
              <div className="stats-page__deep-sub">consecutive days</div>
            </div>
            <div className="stats-page__deep-card">
              <div className="stats-page__deep-label">Consistency</div>
              <div className="stats-page__deep-value">{deep.consistencyPct}%</div>
              <div className="stats-page__deep-sub">days active this month</div>
            </div>
            <div className="stats-page__deep-card">
              <div className="stats-page__deep-label">Avg rep time</div>
              <div className="stats-page__deep-value">{deep.avgRepTimeSeconds.toFixed(1)}s</div>
              <div
                className={`stats-page__deep-sub${deep.avgRepTimeDeltaSeconds <= 0 ? ' stats-page__deep-sub--green' : ' stats-page__deep-sub--red'}`}
              >
                {deep.avgRepTimeDeltaSeconds > 0 ? '+' : ''}
                {deep.avgRepTimeDeltaSeconds.toFixed(1)}s vs last month
              </div>
            </div>
          </div>

          <div className="stats-page__panel stats-page__trend">
            <div className="stats-page__panel-head">
              <span className="stats-page__panel-title">{trendTitle(data.trendMode)}</span>
              <span className="stats-page__panel-sub">
                {data.trendMode === '12w' ? 'Weekly totals' : 'Daily sessions'}
              </span>
            </div>
            <div className="stats-page__bars" aria-hidden>
              {data.trendValues.map((v, i, arr) => {
                const h =
                  v === 0 ? 3 : maxTrend > 0 ? Math.max(8, (v / maxTrend) * 100) : 8
                const isLast = i === arr.length - 1
                const recent = i >= arr.length - 5
                let cls = 'stats-page__bar'
                if (v === 0) cls += ' stats-page__bar--rest'
                else if (isLast) cls += ' stats-page__bar--today'
                else if (recent) cls += ' stats-page__bar--recent'
                else cls += ' stats-page__bar--active'
                return (
                  <div key={i} className="stats-page__bar-wrap" title={String(v)}>
                    <div className={cls} style={{ height: `${h}%` }} />
                  </div>
                )
              })}
            </div>
            <div className="stats-page__week-labels">
              {data.trendWeekLabels.map((lab, i) => (
                <span key={i}>{lab}</span>
              ))}
            </div>
          </div>

          <div className="stats-page__two-col">
            <div className="stats-page__panel">
              <div className="stats-page__panel-head stats-page__panel-head--col">
                <span className="stats-page__panel-title">Head-to-head</span>
                <span className="stats-page__panel-sub">Per opponent</span>
              </div>
              <ul className="stats-page__h2h-list">
                {data.headToHead.map((row) => {
                  const total = row.wins + row.losses
                  const wr = total > 0 ? row.wins / total : 0
                  return (
                    <li key={row.opponent} className="stats-page__h2h-row">
                      <div className="stats-page__h2h-avatar" aria-hidden>
                        {row.initials}
                      </div>
                      <span className="stats-page__h2h-name">{row.opponent}</span>
                      <span className="stats-page__h2h-record">
                        <span className="stats-page__h2h-w">{row.wins}W</span>{' '}
                        <span className="stats-page__h2h-l">{row.losses}L</span>
                      </span>
                      <div className="stats-page__h2h-mini">
                        <div className="stats-page__h2h-mini-fill" style={{ width: `${wr * 100}%` }} />
                      </div>
                      <span className="stats-page__h2h-best">Best: {row.bestScore}</span>
                    </li>
                  )
                })}
                {headToHeadOverall ? (
                  <li className="stats-page__h2h-row stats-page__h2h-row--overall">
                    <div className="stats-page__h2h-avatar stats-page__h2h-avatar--dim" aria-hidden>
                      ∑
                    </div>
                    <span className="stats-page__h2h-name">Overall</span>
                    <span className="stats-page__h2h-record">
                      <span className="stats-page__h2h-w">{headToHeadOverall.wins}W</span>{' '}
                      <span className="stats-page__h2h-l">{headToHeadOverall.losses}L</span>
                    </span>
                    <div className="stats-page__h2h-mini">
                      <div
                        className="stats-page__h2h-mini-fill"
                        style={{
                          width: `${
                            headToHeadOverall.wins + headToHeadOverall.losses > 0
                              ? (headToHeadOverall.wins /
                                  (headToHeadOverall.wins + headToHeadOverall.losses)) *
                                100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                    <span className="stats-page__h2h-best" />
                  </li>
                ) : null}
              </ul>
            </div>

            <div className="stats-page__panel">
              <div className="stats-page__panel-head stats-page__panel-head--col">
                <span className="stats-page__panel-title">Training consistency</span>
                <span className="stats-page__panel-sub">Last 5 weeks</span>
              </div>
              <div className="stats-page__heatmap">
                <div className="stats-page__heatmap-grid">
                  {[0, 1, 2, 3, 4, 5, 6].map((dayIdx) => (
                    <div key={dayIdx} className="stats-page__heatmap-row">
                      <span className="stats-page__heatmap-dayl">{data.heatmap.days[dayIdx]}</span>
                      {data.heatmap.data.map((week, weekIdx) => (
                        <div
                          key={weekIdx}
                          className={`stats-page__heatmap-cell${week[dayIdx] ? ' stats-page__heatmap-cell--on' : ''}`}
                        />
                      ))}
                    </div>
                  ))}
                </div>
                <div className="stats-page__heatmap-legend">
                  <span>No session</span>
                  <span className="stats-page__heatmap-cell" />
                  <span className="stats-page__heatmap-legend-spacer" />
                  <span className="stats-page__heatmap-cell stats-page__heatmap-cell--on" />
                  <span>Active</span>
                </div>
              </div>
            </div>
          </div>

          <h2 className="stats-page__section-label">Solo session log</h2>
          <div className="stats-page__panel stats-page__log">
            {data.soloSessions.length === 0 ? (
              <p className="stats-page__muted stats-page__pad">No solo sessions in this period.</p>
            ) : (
              <ul className="stats-page__log-list">
                {data.soloSessions.map((s, idx) => (
                  <li key={`${s.date}-${idx}`}>
                    <Link
                      to={s.hasVideo ? '/solo/videos' : '/solo'}
                      className={`stats-page__log-row${s.hasVideo ? '' : ' stats-page__log-row--reps-only'}`}
                    >
                      <span className="stats-page__log-date">{formatSessionDate(s.date)}</span>
                      <span className="stats-page__log-reps">
                        {s.reps} reps
                        {s.isPB ? (
                          <span className="stats-page__pb" title="Personal best">
                            PB
                          </span>
                        ) : null}
                      </span>
                      <span className="stats-page__log-meta">
                        {s.hasVideo && s.durationSecs != null && s.avgRepSecs != null
                          ? `${formatSecs(s.durationSecs)} · ${s.avgRepSecs.toFixed(1)}s avg`
                          : 'Reps only'}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <h2 className="stats-page__section-label">Challenge log</h2>
          <div className="stats-page__panel stats-page__log">
            {data.challengeLog.length === 0 ? (
              <p className="stats-page__muted stats-page__pad">No challenges in this period.</p>
            ) : (
              <ul className="stats-page__log-list">
                {data.challengeLog.map((c) => {
                  const youWin = c.yourScore > c.theirScore
                  const theyWin = c.theirScore > c.yourScore
                  return (
                    <li key={c.challengeId}>
                      <Link to={`/c/${c.challengeId}`} className="stats-page__log-row stats-page__chal-row">
                        <span className="stats-page__chal-date">{formatChallengeDate(c.date)}</span>
                        <div className="stats-page__chal-op">
                          <div className="stats-page__chal-avatar" aria-hidden>
                            {c.initials}
                          </div>
                          <span className="stats-page__chal-name">{c.opponent}</span>
                        </div>
                        <span className="stats-page__chal-score">
                          <span className={youWin ? 'stats-page__chal-num--win' : 'stats-page__chal-num--lose'}>
                            {c.yourScore}
                          </span>
                          <span className="stats-page__chal-vs"> vs </span>
                          <span className={theyWin ? 'stats-page__chal-num--win' : 'stats-page__chal-num--lose'}>
                            {c.theirScore}
                          </span>
                        </span>
                        <span
                          className={
                            c.result === 'win'
                              ? 'stats-page__result-pill stats-page__result-pill--win'
                              : 'stats-page__result-pill stats-page__result-pill--loss'
                          }
                        >
                          {c.result === 'win' ? 'Win' : c.result === 'tie' ? 'Tie' : 'Loss'}
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </>
      ) : null}
    </section>
  )
}

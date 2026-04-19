import { useAuth } from '@clerk/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { HttpError } from '../api/httpError'
import { fetchSoloSessions, type SoloSessionListItem } from '../api/solo'
import {
  chartHighlightIndex,
  deriveStats,
  expiringVideoSessions,
  filterSessions,
  formatExpiresCalendarDay,
  formatSessionCardDate,
  hoursRemainingForCopy,
  isVideoExpiringSoon,
  msUntilExpiry,
  soonestSession,
  dayIndexMondayFirst,
  weekRepBucketsFromSessions,
  type VideoFilter,
} from '../lib/myVideosUtils'

import './my-videos.css'

const CHART_DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

function downloadFilename(sessionId: string): string {
  const short = sessionId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12) || 'session'
  return `pushuppros-solo-${short}.mp4`
}

function expiryPillHours(iso: string, now: Date): string {
  const ms = msUntilExpiry(iso, now)
  const h = Math.max(1, Math.ceil(ms / (60 * 60 * 1000)))
  return `${h}h left`
}

function videoExpiryMetaLine(s: SoloSessionListItem, now: Date): { urgent: boolean; text: string } {
  const ms = msUntilExpiry(s.expiresAt, now)
  if (ms <= 0) return { urgent: false, text: 'Expired' }
  if (ms <= 24 * 60 * 60 * 1000) {
    return { urgent: true, text: 'Expires tomorrow — download now' }
  }
  return {
    urgent: false,
    text: `Expires ${formatExpiresCalendarDay(s.expiresAt)}`,
  }
}

export function MyVideos() {
  const { getToken } = useAuth()
  const [sessions, setSessions] = useState<SoloSessionListItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<VideoFilter>('all')
  const [modal, setModal] = useState<{ url: string; sessionId: string } | null>(null)
  const [nowTick, setNowTick] = useState(() => Date.now())

  useEffect(() => {
    const id = window.setInterval(() => setNowTick(Date.now()), 60 * 1000)
    return () => window.clearInterval(id)
  }, [])

  const now = useMemo(() => new Date(nowTick), [nowTick])

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const list = await fetchSoloSessions(getToken)
        if (!cancelled) {
          setSessions(list)
        }
      } catch (e) {
        if (!cancelled) {
          const msg =
            e instanceof HttpError
              ? e.message
              : e instanceof Error
                ? e.message
                : 'Something went wrong.'
          setError(msg)
          setSessions(null)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [getToken])

  const stats = useMemo(() => deriveStats(sessions ?? []), [sessions])

  const personalBest = stats.personalBest

  const weekBuckets = useMemo(
    () => weekRepBucketsFromSessions(sessions ?? [], now),
    [sessions, now],
  )

  const todayMondayIdx = useMemo(() => dayIndexMondayFirst(now), [now])

  const highlightIdx = useMemo(
    () => chartHighlightIndex(weekBuckets, todayMondayIdx),
    [weekBuckets, todayMondayIdx],
  )

  const maxWeekReps = useMemo(() => Math.max(1, ...weekBuckets), [weekBuckets])

  const expiringRecorded = useMemo(
    () => expiringVideoSessions(sessions ?? [], now),
    [sessions, now],
  )

  const bannerSession = useMemo(
    () => (expiringRecorded.length ? soonestSession(expiringRecorded) : null),
    [expiringRecorded],
  )

  const bannerHours = useMemo(() => {
    if (!bannerSession) return 0
    return hoursRemainingForCopy(msUntilExpiry(bannerSession.expiresAt, now))
  }, [bannerSession, now])

  const filteredSessions = useMemo(
    () => filterSessions(sessions ?? [], filter),
    [sessions, filter],
  )

  const closeModal = useCallback(() => setModal(null), [])

  useEffect(() => {
    if (!modal) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [modal, closeModal])

  const showDataChrome = !loading && !error && sessions && sessions.length > 0

  return (
    <section className="my-videos-page">
      <header className="my-videos-header">
        <div className="my-videos-header-text">
          <h1 className="my-videos-title">My videos</h1>
          <p className="my-videos-subtitle">Solo sessions — recordings and reps-only sets.</p>
        </div>
        <Link to="/solo" className="my-videos-record-btn">
          + Record new set
        </Link>
      </header>

      {loading ? <p className="my-videos-muted">Loading…</p> : null}
      {error ? (
        <p className="my-videos-muted" role="alert">
          {error}
        </p>
      ) : null}

      {!loading && !error && sessions && sessions.length === 0 ? (
        <div className="my-videos-empty-card">
          <p>No recordings yet.</p>
          <Link to="/solo" className="my-videos-record-btn my-videos-record-btn--block">
            + Record new set
          </Link>
        </div>
      ) : null}

      {showDataChrome && expiringRecorded.length > 0 && bannerSession?.videoUrl ? (
        <div className="my-videos-banner" role="status">
          <div className="my-videos-banner-icon" aria-hidden>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
              <path d="M12 7v6l4 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <p className="my-videos-banner-text">
            <strong className="my-videos-banner-strong">{expiringRecorded.length}</strong>{' '}
            {expiringRecorded.length === 1 ? 'video expires' : 'videos expire'} in {bannerHours}{' '}
            {bannerHours === 1 ? 'hour' : 'hours'}. Download or share{' '}
            {expiringRecorded.length === 1 ? 'it before it’s gone' : 'them before they’re gone'}.
          </p>
          <a
            className="my-videos-banner-download"
            href={bannerSession.videoUrl}
            download={downloadFilename(bannerSession.sessionId)}
          >
            Download →
          </a>
        </div>
      ) : null}

      {showDataChrome ? (
        <>
          <div className="my-videos-top">
            <div className="my-videos-chart-card">
              <div className="my-videos-chart-head">
                <span className="my-videos-chart-title">Reps per session</span>
                <span className="my-videos-chart-sub">Last 7 sessions</span>
              </div>
              <div
                className="my-videos-chart-bars"
                role="img"
                aria-label="Reps per weekday this week"
              >
                {weekBuckets.map((val, i) => {
                  const isMissed = val === 0
                  const pct = isMissed ? 3 : Math.max(8, (val / maxWeekReps) * 100)
                  const isHi = highlightIdx >= 0 && i === highlightIdx && !isMissed
                  return (
                    <div key={`chart-day-${i}`} className="my-videos-bar-col">
                      <span className="my-videos-bar-val">{isMissed ? '—' : val}</span>
                      <div className="my-videos-bar-track">
                        <div
                          className={`my-videos-bar-fill ${isMissed ? 'my-videos-bar-fill--missed' : ''} ${isHi ? 'my-videos-bar-fill--hi' : ''}`}
                          style={{ height: `${pct}%` }}
                        />
                      </div>
                      <span className="my-videos-bar-day">{CHART_DAYS[i]}</span>
                    </div>
                  )
                })}
              </div>

              <div className="my-videos-stats-embed">
                <div className="my-videos-stats-card my-videos-stats-card--embed">
                  <p className="my-videos-pb-label">Personal best</p>
                  <p className="my-videos-pb-value">{personalBest} reps</p>
                  <span className="my-videos-pb-badge">All-time record</span>
                  <div className="my-videos-stats-divider" />
                  <div className="my-videos-mini-grid">
                    <div className="my-videos-mini-cell">
                      <span className="my-videos-mini-label">Sessions</span>
                      <span className="my-videos-mini-value">{stats.totalSessions}</span>
                    </div>
                    <div className="my-videos-mini-cell">
                      <span className="my-videos-mini-label">Total reps</span>
                      <span className="my-videos-mini-value">{stats.totalReps}</span>
                    </div>
                    <div className="my-videos-mini-cell">
                      <span className="my-videos-mini-label">Avg set</span>
                      <span className="my-videos-mini-value">{stats.avgRepsPerSet}</span>
                    </div>
                    <div className="my-videos-mini-cell">
                      <span className="my-videos-mini-label">With video</span>
                      <span className="my-videos-mini-value">{stats.sessionsWithVideo}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <aside className="my-videos-stats-card my-videos-stats-card--aside" aria-label="Personal best and stats">
              <p className="my-videos-pb-label">Personal best</p>
              <p className="my-videos-pb-value">{personalBest} reps</p>
              <span className="my-videos-pb-badge">All-time record</span>
              <div className="my-videos-stats-divider" />
              <div className="my-videos-mini-grid">
                <div className="my-videos-mini-cell">
                  <span className="my-videos-mini-label">Sessions</span>
                  <span className="my-videos-mini-value">{stats.totalSessions}</span>
                </div>
                <div className="my-videos-mini-cell">
                  <span className="my-videos-mini-label">Total reps</span>
                  <span className="my-videos-mini-value">{stats.totalReps}</span>
                </div>
                <div className="my-videos-mini-cell">
                  <span className="my-videos-mini-label">Avg set</span>
                  <span className="my-videos-mini-value">{stats.avgRepsPerSet}</span>
                </div>
                <div className="my-videos-mini-cell">
                  <span className="my-videos-mini-label">With video</span>
                  <span className="my-videos-mini-value">{stats.sessionsWithVideo}</span>
                </div>
              </div>
            </aside>
          </div>

          <div className="my-videos-filters" role="group" aria-label="Filter sessions">
            {(
              [
                ['all', 'All'],
                ['video', 'With video'],
                ['repsOnly', 'Reps only'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={`my-videos-pill ${filter === key ? 'my-videos-pill--active' : ''}`}
                onClick={() => setFilter(key)}
                aria-pressed={filter === key}
              >
                {label}
              </button>
            ))}
          </div>

          {filteredSessions.length === 0 ? (
            <p className="my-videos-muted">No sessions match this filter.</p>
          ) : (
            <ul className="my-videos-grid">
              {filteredSessions.map((s) => {
                const hasVideo = Boolean(s.videoUrl)
                const isPb = personalBest > 0 && s.reps === personalBest
                const expiring = hasVideo && isVideoExpiringSoon(s, now)
                const cardClass = [
                  'my-videos-card',
                  expiring ? 'my-videos-card--expiring' : '',
                  !hasVideo ? 'my-videos-card--reps-only' : '',
                ]
                  .filter(Boolean)
                  .join(' ')

                const meta = hasVideo ? videoExpiryMetaLine(s, now) : null

                const body = (
                  <>
                    <div className="my-videos-thumb">
                      <span className="my-videos-tag my-videos-tag--type">Solo</span>
                      {hasVideo && expiring ? (
                        <span className="my-videos-tag my-videos-tag--expiry">
                          {expiryPillHours(s.expiresAt, now)}
                        </span>
                      ) : null}
                      {hasVideo ? (
                        <>
                          <video
                            src={s.videoUrl!}
                            className="my-videos-thumb-video"
                            muted
                            playsInline
                            preload="metadata"
                            aria-hidden
                          />
                          <span className="my-videos-play" aria-hidden>
                            <svg width="12" height="14" viewBox="0 0 12 14" fill="none">
                              <path d="M0 0v14l12-7L0 0z" fill="currentColor" />
                            </svg>
                          </span>
                        </>
                      ) : (
                        <div className="my-videos-thumb-placeholder">
                          <span className="my-videos-no-rec-pill">No recording</span>
                        </div>
                      )}
                    </div>
                    <div className="my-videos-info">
                      <div className="my-videos-reps-row">
                        <span
                          className={
                            hasVideo ? 'my-videos-reps' : 'my-videos-reps my-videos-reps--dim'
                          }
                        >
                          {s.reps} reps
                        </span>
                        {isPb ? <span className="my-videos-pb-inline">PB</span> : null}
                      </div>
                      <p className="my-videos-date">{formatSessionCardDate(s.createdAt)}</p>
                      {hasVideo && meta ? (
                        <p
                          className={
                            meta.urgent
                              ? 'my-videos-expiry-line my-videos-expiry-line--urgent'
                              : 'my-videos-expiry-line'
                          }
                        >
                          {meta.text}
                        </p>
                      ) : (
                        <p className="my-videos-reps-only-line">Reps only</p>
                      )}
                    </div>
                  </>
                )

                return (
                  <li key={s.sessionId}>
                    {hasVideo ? (
                      <button
                        type="button"
                        className={cardClass}
                        onClick={() => setModal({ url: s.videoUrl!, sessionId: s.sessionId })}
                      >
                        {body}
                      </button>
                    ) : (
                      <div className={cardClass}>{body}</div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </>
      ) : null}

      {modal ? (
        <div
          className="my-videos-modal-backdrop"
          role="presentation"
          onClick={closeModal}
        >
          <div
            className="my-videos-modal"
            role="dialog"
            aria-modal
            aria-label="Video playback"
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" className="my-videos-modal-close" onClick={closeModal}>
              Close
            </button>
            <video
              className="my-videos-modal-video"
              src={modal.url}
              controls
              playsInline
              autoPlay
            />
            <a
              className="my-videos-modal-download"
              href={modal.url}
              download={downloadFilename(modal.sessionId)}
            >
              Download
            </a>
          </div>
        </div>
      ) : null}
    </section>
  )
}

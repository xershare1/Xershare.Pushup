import { useAuth } from '@clerk/react'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { fetchChallengeVideos, type ChallengeVideoItem, type ChallengeVideosPage } from '../api/challenges'
import { HttpError } from '../api/httpError'
import { VideoModalPlayer } from '../components/video/VideoModalPlayer'
import { PageLoading } from '../components/ui/PageLoading'
import { challengeVideoExpiryHoursCopy, isChallengeVideoExpiringSoon } from '../lib/challengeVideosUtils'
import { formatError } from '../lib/formatError'

import './challenge-videos.css'

type CvFilter = 'all' | 'won' | 'lost' | 'challenger' | 'opponent'

const FILTER_OPTIONS: { id: CvFilter; label: string }[] = [
  ['all', 'All'],
  ['won', 'Won'],
  ['lost', 'Lost'],
  ['challenger', 'As challenger'],
  ['opponent', 'As opponent'],
].map(([id, label]) => ({ id: id as CvFilter, label }))

function matchesFilter(v: ChallengeVideoItem, f: CvFilter): boolean {
  if (f === 'all') return true
  if (f === 'won') return v.result === 'won'
  if (f === 'lost') return v.result === 'lost'
  if (f === 'challenger') return v.role === 'challenger'
  if (f === 'opponent') return v.role === 'opponent'
  return true
}

function formatRecorded(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return iso
  }
}

function downloadFilename(challengeId: string): string {
  const short = challengeId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12) || 'challenge'
  return `pushuppros-challenge-${short}.mp4`
}

function VideoThumb({ v, wonLostBadge }: { v: ChallengeVideoItem; wonLostBadge: ReactNode }) {
  const hasVideo = Boolean(v.videoUrl)
  return (
    <div className="cv-thumb">
      {wonLostBadge}
      {hasVideo ? (
        <>
          <video
            src={v.videoUrl!}
            className="cv-thumb-video"
            muted
            playsInline
            preload="metadata"
            aria-hidden
          />
          <span className="cv-play" aria-hidden>
            <span className="cv-play__circle">
              <svg width="12" height="14" viewBox="0 0 12 14" fill="none">
                <path d="M0 0v14l12-7L0 0z" fill="currentColor" />
              </svg>
            </span>
          </span>
        </>
      ) : (
        <div className="cv-thumb-placeholder">No video</div>
      )}
    </div>
  )
}

function CardBody({
  v,
  now,
  expiring,
  youWin,
  theyWin,
  primaryView,
}: {
  v: ChallengeVideoItem
  now: Date
  expiring: boolean
  youWin: boolean
  theyWin: boolean
  primaryView: boolean
}) {
  const hasVideo = Boolean(v.videoUrl)
  const tieScore = v.yourScore === v.theirScore
  return (
    <div className="cv-body">
      <div className="cv-top">
        <div>
          <div className="cv-vs-row">
            <span className="cv-avatar" aria-hidden>
              {v.opponent.initials}
            </span>
            <span className="cv-vs-text">vs {v.opponent.username}</span>
          </div>
          <p className="cv-date">{formatRecorded(v.recordedAt)}</p>
        </div>
        <div className="cv-scores">
          <div className="cv-score-row">
            <span
              className={`cv-score-val ${youWin || tieScore ? 'cv-score-val--win' : 'cv-score-val--lose'}`}
            >
              {v.yourScore}
            </span>
            <span className="cv-score-vs">vs</span>
            <span
              className={`cv-score-val ${theyWin || tieScore ? 'cv-score-val--win' : 'cv-score-val--lose'}`}
            >
              {v.theirScore}
            </span>
          </div>
          <div className="cv-score-labels">
            <span>you</span>
            <span>them</span>
          </div>
        </div>
      </div>
      <div className="cv-bottom">
        <div className="cv-meta">
          <span className="cv-role">{v.role === 'challenger' ? 'Challenger' : 'Opponent'}</span>
          {expiring ? <span className="cv-expiry-tag">{challengeVideoExpiryHoursCopy(v.expiresAt, now)}</span> : null}
        </div>
        <div
          className="cv-actions"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          role="group"
        >
          {hasVideo ? (
            <a
              className="cv-btn cv-btn--ghost"
              href={v.videoUrl!}
              download={downloadFilename(v.challengeId)}
              target="_blank"
              rel="noopener noreferrer"
              data-cv-download
            >
              Download
            </a>
          ) : null}
          <Link
            className={primaryView ? 'cv-btn cv-btn--primary' : 'cv-btn cv-btn--ghost'}
            to={`/c/${v.challengeId}`}
          >
            {primaryView ? 'View result →' : 'View result'}
          </Link>
        </div>
      </div>
    </div>
  )
}

function ChallengeVideoCardRow({
  v,
  now,
  onOpenVideo,
}: {
  v: ChallengeVideoItem
  now: Date
  onOpenVideo: (url: string, challengeId: string) => void
}) {
  const expiring = isChallengeVideoExpiringSoon(v, now)
  const hasVideo = Boolean(v.videoUrl)
  const youWin = v.yourScore > v.theirScore
  const theyWin = v.theirScore > v.yourScore

  const borderClass =
    v.result === 'won' ? 'cv-card--win' : v.result === 'lost' ? 'cv-card--loss' : 'cv-card--loss'

  const cardClass = ['cv-card', borderClass, expiring ? 'cv-card--expiring' : ''].filter(Boolean).join(' ')

  const wonLostBadge =
    v.result === 'won' ? (
      <span className="cv-badge cv-badge--won">Won</span>
    ) : v.result === 'lost' ? (
      <span className="cv-badge cv-badge--lost">Lost</span>
    ) : (
      <span className="cv-badge cv-badge--tie">Tie</span>
    )

  const primaryView = v.result === 'won'

  const inner = (
    <>
      <VideoThumb v={v} wonLostBadge={wonLostBadge} />
      <CardBody v={v} now={now} expiring={expiring} youWin={youWin} theyWin={theyWin} primaryView={primaryView} />
    </>
  )

  if (hasVideo) {
    return (
      <button type="button" className={cardClass} onClick={() => onOpenVideo(v.videoUrl!, v.challengeId)}>
        {inner}
      </button>
    )
  }

  return <div className={cardClass}>{inner}</div>
}

export function ChallengeVideos() {
  const { getToken } = useAuth()
  const [page, setPage] = useState<ChallengeVideosPage | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<CvFilter>('all')
  const [now, setNow] = useState(() => new Date())
  const [modal, setModal] = useState<{ url: string; challengeId: string } | null>(null)

  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(t)
  }, [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await fetchChallengeVideos(getToken)
        if (!cancelled) setPage(data)
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof HttpError ? e.message : formatError(e))
          setPage(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [getToken])

  const filtered = useMemo(() => {
    const list = page?.challengeVideos ?? []
    return list.filter((v) => matchesFilter(v, filter))
  }, [page, filter])

  const expiringSubset = useMemo(() => filtered.filter((v) => isChallengeVideoExpiringSoon(v, now)), [filtered, now])

  const closeModal = useCallback(() => setModal(null), [])

  const onOpenVideo = useCallback((url: string, challengeId: string) => {
    setModal({ url, challengeId })
  }, [])

  const stats = page?.stats

  return (
    <section className="cv-page">
      <header>
        <h1 className="cv-title">Challenge videos</h1>
        <p className="cv-sub">
          Recordings from your head-to-head challenge sessions — video proof of every result.
        </p>
      </header>

      {loading ? <PageLoading layout="inline" message="Loading…" messageClassName="cv-sub" /> : null}
      {error ? (
        <p className="banner banner-error" role="alert">
          {error}
        </p>
      ) : null}

      {!loading && !error && page && page.challengeVideos.length === 0 ? (
        <div className="cv-empty">
          <p>
            No challenge videos yet. Submit a challenge attempt with a recording, or open an existing
            challenge.
          </p>
          <div className="cv-empty-actions">
            <Link className="btn btn-primary" to="/challenge">
              Start a challenge
            </Link>
            <Link className="btn btn-ghost" to="/my-challenges">
              My challenges
            </Link>
          </div>
        </div>
      ) : null}

      {!loading && !error && stats && page && page.challengeVideos.length > 0 ? (
        <>
          <div className="cv-stats">
            <div className="cv-stat">
              <div className="cv-stat__val">{stats.total}</div>
              <div className="cv-stat__label">Total recordings</div>
            </div>
            <div className="cv-stat">
              <div className="cv-stat__val cv-stat__val--wins">{stats.wins}W</div>
              <div className="cv-stat__label">Wins with video</div>
            </div>
            <div className="cv-stat">
              <div className="cv-stat__val cv-stat__val--losses">{stats.losses}L</div>
              <div className="cv-stat__label">Losses with video</div>
            </div>
            <div className="cv-stat">
              <div className="cv-stat__val cv-stat__val--best">{stats.bestReps}</div>
              <div className="cv-stat__label">Best challenge reps</div>
            </div>
          </div>

          <div className="cv-filters" role="group" aria-label="Filter recordings">
            {FILTER_OPTIONS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                className={`cv-pill ${filter === id ? 'cv-pill--active' : ''}`}
                onClick={() => setFilter(id)}
                aria-pressed={filter === id}
              >
                {label}
              </button>
            ))}
          </div>

          {expiringSubset.length > 0 ? (
            <>
              <h2 className="cv-section-label">Expiring soon</h2>
              <ul className="cv-list">
                {expiringSubset.map((v) => (
                  <li key={`exp-${v.id}`}>
                    <ChallengeVideoCardRow v={v} now={now} onOpenVideo={onOpenVideo} />
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          <h2 className={`cv-section-label ${expiringSubset.length > 0 ? 'cv-section-label--spaced' : ''}`}>
            All recordings
          </h2>
          {filtered.length === 0 ? (
            <p className="cv-sub">No recordings match this filter.</p>
          ) : (
            <ul className="cv-list">
              {filtered.map((v) => (
                <li key={v.id}>
                  <ChallengeVideoCardRow v={v} now={now} onOpenVideo={onOpenVideo} />
                </li>
              ))}
            </ul>
          )}
        </>
      ) : null}

      {modal ? (
        <div className="cv-modal-backdrop" role="presentation" onClick={closeModal}>
          <div
            className="cv-modal"
            role="dialog"
            aria-modal
            aria-label="Video playback"
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" className="cv-modal-close" onClick={closeModal}>
              Close
            </button>
            <VideoModalPlayer
              key={modal.url}
              url={modal.url}
              videoClassName="cv-modal-video"
              wrapClassName="cv-modal-video-wrap"
            />
            <a className="cv-modal-download" href={modal.url} download={downloadFilename(modal.challengeId)}>
              Download
            </a>
          </div>
        </div>
      ) : null}
    </section>
  )
}

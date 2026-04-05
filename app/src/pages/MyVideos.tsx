import { useAuth } from '@clerk/react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { HttpError } from '../api/httpError'
import { fetchSoloSessions, type SoloSessionListItem } from '../api/solo'

import './my-videos.css'

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return iso
  }
}

export function MyVideos() {
  const { getToken } = useAuth()
  const [sessions, setSessions] = useState<SoloSessionListItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

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

  return (
    <section className="stack my-videos-page">
      <h1 className="page-title">My videos</h1>
      <p className="lede">
        Solo attempts with recordings play from secure links. Reps-only sessions appear without a
        video.
      </p>

      {loading ? <p className="muted">Loading…</p> : null}
      {error ? (
        <p className="muted" role="alert">
          {error}
        </p>
      ) : null}

      {!loading && !error && sessions && sessions.length === 0 ? (
        <div className="card stack">
          <p>No recordings yet.</p>
          <Link to="/solo" className="btn btn-primary">
            Record a solo set
          </Link>
        </div>
      ) : null}

      {!loading && sessions && sessions.length > 0 ? (
        <ul className="my-videos-grid">
          {sessions.map((s) => (
            <li key={s.sessionId} className="card my-videos-card">
              {s.videoUrl ? (
                <div className="my-videos-thumb">
                  <video
                    src={s.videoUrl}
                    controls
                    muted
                    playsInline
                    preload="metadata"
                    className="my-videos-video"
                  />
                </div>
              ) : (
                <div className="my-videos-no-video muted">No video for this session</div>
              )}
              <div className="my-videos-meta">
                <strong>{s.reps} reps</strong>
                <span>{formatWhen(s.createdAt)}</span>
                <span className="muted my-videos-expires">Expires {formatWhen(s.expiresAt)}</span>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {!loading && sessions && sessions.length > 0 ? (
        <p className="muted">
          <Link to="/solo">Record another solo set</Link>
        </p>
      ) : null}
    </section>
  )
}

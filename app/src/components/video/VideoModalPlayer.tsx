import { useEffect, useRef, useState } from 'react'

import './video-modal-player.css'

type Props = {
  url: string
  /** Classes for the `<video>` (e.g. width / max-height from page styles). */
  videoClassName: string
  /** Optional wrapper class (e.g. page-specific spacing). */
  wrapClassName?: string
}

/**
 * In-modal playback with aggressive preload, autoplay only after `canplay`,
 * and lightweight loading / buffering overlays for remote (e.g. S3 presigned) sources.
 */
export function VideoModalPlayer({ url, videoClassName, wrapClassName }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const triedAutoplayRef = useRef(false)
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [buffering, setBuffering] = useState(false)

  useEffect(() => {
    const el = videoRef.current
    if (!el) return

    triedAutoplayRef.current = false

    const tryAutoplayOnce = () => {
      if (triedAutoplayRef.current) return
      triedAutoplayRef.current = true
      void el.play().catch(() => {
        /* Blocked or unsupported — user can press play on controls */
      })
    }

    const onCanPlay = () => {
      setLoadState('ready')
      tryAutoplayOnce()
    }

    const onError = () => {
      setLoadState('error')
      setBuffering(false)
    }

    const onWaiting = () => {
      if (el.readyState < 3) return
      setBuffering(true)
    }

    const onPlaying = () => {
      setBuffering(false)
      setLoadState('ready')
    }

    el.addEventListener('canplay', onCanPlay)
    el.addEventListener('error', onError)
    el.addEventListener('waiting', onWaiting)
    el.addEventListener('playing', onPlaying)

    return () => {
      el.removeEventListener('canplay', onCanPlay)
      el.removeEventListener('error', onError)
      el.removeEventListener('waiting', onWaiting)
      el.removeEventListener('playing', onPlaying)
    }
  }, [url])

  const showBuffering = loadState === 'ready' && buffering

  return (
    <div className={['video-modal-player', wrapClassName].filter(Boolean).join(' ')}>
      <video
        ref={videoRef}
        key={url}
        className={videoClassName}
        src={url}
        controls
        playsInline
        preload="auto"
      />
      {loadState === 'loading' ? (
        <div className="video-modal-player__overlay" role="status" aria-live="polite">
          Loading video…
        </div>
      ) : null}
      {showBuffering ? (
        <div
          className="video-modal-player__overlay video-modal-player__overlay--buffer"
          role="status"
          aria-live="polite"
        >
          <span className="video-modal-player__buffer-pill">Buffering…</span>
        </div>
      ) : null}
      {loadState === 'error' ? (
        <div className="video-modal-player__overlay video-modal-player__overlay--error" role="alert">
          Could not load this video.
        </div>
      ) : null}
    </div>
  )
}

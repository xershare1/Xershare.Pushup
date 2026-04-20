import { Link } from 'react-router-dom'

/**
 * Hub for video destinations: used by the bottom tab and tablet sidebar rail
 * where nested “Solo / Challenge” labels are hidden.
 */
export function VideosHub() {
  return (
    <section className="videos-hub">
      <header className="videos-hub__header">
        <h1 className="videos-hub__title">Videos</h1>
        <p className="videos-hub__sub">Choose solo recordings or challenge attempts.</p>
      </header>
      <div className="videos-hub__grid">
        <Link className="videos-hub__card" to="/solo/videos">
          <span className="videos-hub__card-title">Solo sessions</span>
          <span className="videos-hub__card-desc">Recordings and reps-only sets</span>
        </Link>
        <Link className="videos-hub__card" to="/videos/challenges">
          <span className="videos-hub__card-title">Challenge sessions</span>
          <span className="videos-hub__card-desc">Attempts from head-to-head challenges</span>
        </Link>
      </div>
    </section>
  )
}

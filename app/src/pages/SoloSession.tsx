import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PushupSession } from '../components/pushupSession/PushupSession'

import '../components/pushupSession/pushup-session.css'

type Mode = 'choose' | 'record'

function ClockIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="M12 7v5l3 2" />
    </svg>
  )
}

/**
 * Practice alone: camera + reps + optional video persisted as POST /solo/session.
 * Distinct from challenge flows under /challenge/*.
 */
export function SoloSession() {
  const [mode, setMode] = useState<Mode>('choose')

  function backToChoose() {
    setMode('choose')
  }

  if (mode === 'record') {
    return <PushupSession onBack={backToChoose} variant="solo" />
  }

  return (
    <section className="solo-choose">
      <div className="solo-choose-card">
        <div className="solo-choose-icon" aria-hidden>
          <ClockIcon />
        </div>
        <h1 className="solo-choose-title">Solo session</h1>
        <p className="solo-choose-subtitle">
          Practice on your own. Your reps and optional video are saved to your account — not a
          head-to-head challenge.
        </p>
        <div className="solo-choose-pills">
          <span className="solo-choose-pill">
            <span className="solo-choose-pill-dot" aria-hidden />
            60 second set
          </span>
          <span className="solo-choose-pill">
            <span className="solo-choose-pill-dot" aria-hidden />
            AI rep counting
          </span>
          <span className="solo-choose-pill">
            <span className="solo-choose-pill-dot" aria-hidden />
            Video saved
          </span>
        </div>
        <button
          type="button"
          className="solo-choose-cta"
          onClick={() => setMode('record')}
        >
          Start solo set →
        </button>
        <p className="solo-choose-foot">
          Want to compete?{' '}
          <Link to="/challenge" className="solo-choose-link">
            Start a challenge
          </Link>
          .
        </p>
      </div>
    </section>
  )
}

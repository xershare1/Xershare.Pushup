import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PushupSession } from '../components/pushupSession/PushupSession'

type Mode = 'choose' | 'record'

/**
 * Practice alone: camera + reps + optional video persisted as POST /solo/session.
 * Distinct from challenge flows under /challenge/*.
 */
export function SoloSession() {
  const [mode, setMode] = useState<Mode>('choose')

  function backToChoose() {
    setMode('choose')
  }

  return (
    <section
      className={mode === 'record' ? 'stack pushup-session-page' : 'stack narrow'}
    >
      <h1 className="page-title">Solo session</h1>
      <p className="lede">
        Practice on your own. We log your reps (and optional video) to your account — not a
        head-to-head challenge.
      </p>

      {mode === 'choose' ? (
        <div className="card stack">
          <div
            className="actions"
            style={{ flexDirection: 'column', alignItems: 'stretch' }}
          >
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setMode('record')}
            >
              Start solo set
            </button>
          </div>
          <p className="muted" style={{ margin: 0, fontSize: '0.9rem' }}>
            Want to compete instead?{' '}
            <Link to="/challenge/start">Start a challenge</Link>.
          </p>
        </div>
      ) : null}

      {mode === 'record' ? (
        <PushupSession onBack={backToChoose} variant="solo" />
      ) : null}
    </section>
  )
}

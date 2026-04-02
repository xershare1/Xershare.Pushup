import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PushupSession } from '../components/pushupSession/PushupSession'

type Mode = 'choose' | 'record'

export function ChallengeStart() {
  const [mode, setMode] = useState<Mode>('choose')

  function backToChoose() {
    setMode('choose')
  }

  return (
    <section
      className={mode === 'record' ? 'stack pushup-session-page' : 'stack narrow'}
    >
      <h1 className="page-title">Challenge video</h1>
      <p className="lede">
        Record with your camera. Everything stays on this device until you continue.
      </p>

      {mode === 'choose' ? (
        <div className="card stack">
          <div className="actions" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setMode('record')}
            >
              Record video
            </button>
          </div>
          <p className="muted" style={{ margin: 0, fontSize: '0.9rem' }}>
            <Link to="/challenge/create">Continue to create challenge</Link> — skip video for now.
          </p>
        </div>
      ) : null}

      {mode === 'record' ? <PushupSession onBack={backToChoose} /> : null}
    </section>
  )
}

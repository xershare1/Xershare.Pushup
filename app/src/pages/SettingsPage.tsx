import { PageLoading } from '../components/ui/PageLoading'
import { useVoiceRepCounterPreference } from '../context/useVoiceRepCounterPreference'

import { PwaInstallSettingsSection } from './PwaInstallSettingsSection'
import './SettingsPage.css'

/**
 * Account preferences: sound and voice (server-persisted where applicable).
 */
export function SettingsPage() {
  const { voiceRepCounterEnabled, loading, setVoiceRepCounterEnabled } =
    useVoiceRepCounterPreference()

  if (loading) {
    return (
      <PageLoading pageDensity="tight" message="Loading settings…" messageClassName="app-page-loading__msg muted" />
    )
  }

  return (
    <section className="stack narrow settings-page voice-rep-counter-settings">
      <h1 className="page-title">Settings</h1>
      <p className="lede">Preferences for your account and sessions.</p>

      <div className="card stack settings-page__sound-card">
        <h2 className="settings-page__section-title">Sound &amp; voice</h2>
        <label className="settings-page__toggle-row">
          <div className="settings-page__toggle-copy">
            <span className="settings-page__toggle-label">Session audio</span>
            <span className="settings-page__toggle-desc muted">
              Rep milestones spoken aloud (every 10 reps) plus short sounds for the start countdown and the
              last 10 seconds of your set.
            </span>
            <span className="settings-page__note muted">
              Voice quality varies by device. Mute anytime during a session from the speaker control on the
              workout screen.
            </span>
          </div>
          <input
            type="checkbox"
            className="settings-page__toggle-input"
            checked={voiceRepCounterEnabled}
            onChange={(e) => void setVoiceRepCounterEnabled(e.target.checked)}
            role="switch"
            aria-checked={voiceRepCounterEnabled}
          />
        </label>
      </div>

      <PwaInstallSettingsSection />
    </section>
  )
}

import { PwaInstallOfferBody } from '../components/pwa/PwaInstallOfferBody'

/**
 * Settings card: Chromium install prompt, iOS “Add to Home Screen”, generic desktop hints.
 */
export function PwaInstallSettingsSection() {
  if (!import.meta.env.PROD) {
    return null
  }

  return (
    <div className="card stack settings-page__sound-card settings-page__install-card">
      <h2 className="settings-page__section-title">Install app</h2>
      <PwaInstallOfferBody />
    </div>
  )
}

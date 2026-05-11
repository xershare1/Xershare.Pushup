import { Link } from 'react-router-dom'

import { PwaInstallOfferBody } from '../components/pwa/PwaInstallOfferBody'

import './SettingsPage.css'

/** Unlinked entry point for testers; Chromium install UX needs prod/preview HTTPS. */
export function SecretPwaInstallPage() {
  return (
    <section className="stack narrow settings-page voice-rep-counter-settings">
      <p className="muted" style={{ margin: '0 0 0.5rem' }}>
        <Link to="/dashboard">← Dashboard</Link>
      </p>
      <h1 className="page-title">Install PushupPros</h1>
      <p className="lede">This URL is not advertised in the UI — bookmark it if you plan to reinstall later.</p>

      {!import.meta.env.PROD ? (
        <p className="banner banner-warn" role="status">
          Development server: the native Chromium install prompt usually needs a preview build served over HTTPS
          ({' '}
          <code style={{ whiteSpace: 'nowrap' }}>npm run build</code>, then{' '}
          <code style={{ whiteSpace: 'nowrap' }}>npm run preview</code>
          ).
        </p>
      ) : null}

      <div className="card stack settings-page__sound-card settings-page__install-card">
        <h2 className="settings-page__section-title">Add to device</h2>
        <PwaInstallOfferBody />
      </div>
    </section>
  )
}

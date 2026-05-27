import { usePwaInstall } from '../../lib/pwa/usePwaInstall'

/**
 * Chromium install button, Safari “Add to Home Screen” steps, or generic desktop hints.
 */
export function PwaInstallOfferBody() {
  const { standalone, canPrompt, showIosInstallHint, promptInstall } = usePwaInstall()

  if (standalone) {
    return (
      <p className="muted" style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.45 }}>
        You&apos;re using the installed PushupPros app — install prompts are hidden.
      </p>
    )
  }

  if (canPrompt) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        <p className="muted" style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.45 }}>
          Add PushupPros to your home screen or dock for quicker access while signed in with the same
          account (requires HTTPS when deployed).
        </p>
        <button type="button" className="btn btn-primary" onClick={() => void promptInstall()}>
          Install
        </button>
      </div>
    )
  }

  if (showIosInstallHint) {
    return (
      <ul className="settings-page__install-steps muted">
        <li>Open Safari on your iPhone or iPad.</li>
        <li>Tap Share, then tap Add to Home Screen.</li>
        <li>Confirm the name PushupPros, then open the icon from your home screen.</li>
      </ul>
    )
  }

  return (
    <p className="muted" style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.45 }}>
      If your browser offers an Install or shortcut option (often near the address bar or in the browser
      menu), you can use PushupPros like a standalone app. Install prompts require HTTPS when deployed.
    </p>
  )
}

import { useCallback, useSyncExternalStore } from 'react'

export type PwaPromptOutcome = 'accepted' | 'dismissed' | 'unavailable'

function subscribeStandalone(listener: () => void) {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener('focus', listener)
  return () => window.removeEventListener('focus', listener)
}

function snapshotStandalone(): boolean {
  return isPwaStandalone()
}

/**
 * Deferred Chromium install candidate — survives route changes (`beforeinstallprompt` fires at most ~once/session).
 */
let deferredBeforeInstall: BeforeInstallPromptEvent | null = null
const deferredPromptListeners = new Set<() => void>()
let deferredPromptListenersInstalled = false

function notifyDeferredPromptSubscribers(): void {
  deferredPromptListeners.forEach((listener) => {
    listener()
  })
}

function attachDeferredPromptWindowListenersOnce(): void {
  if (typeof window === 'undefined' || deferredPromptListenersInstalled) {
    return
  }
  deferredPromptListenersInstalled = true

  window.addEventListener('beforeinstallprompt', (event: Event) => {
    const ev = event as BeforeInstallPromptEvent
    ev.preventDefault()
    deferredBeforeInstall = ev
    notifyDeferredPromptSubscribers()
  })

  window.addEventListener('appinstalled', () => {
    deferredBeforeInstall = null
    notifyDeferredPromptSubscribers()
  })
}

/**
 * Call once from the client entry (e.g. `main.tsx`) before route render so
 * `beforeinstallprompt` / `appinstalled` are not missed. Safe on SSR: no-ops when `window` is undefined.
 */
export function initPwaInstallListeners(): void {
  attachDeferredPromptWindowListenersOnce()
}

function subscribeDeferredPromptAvailability(listener: () => void) {
  if (typeof window === 'undefined') {
    return () => {}
  }
  deferredPromptListeners.add(listener)
  return () => {
    deferredPromptListeners.delete(listener)
  }
}

function snapshotCanPrompt(): boolean {
  return deferredBeforeInstall !== null
}

/**
 * Already running as installed PWA / home screen shortcut.
 */
export function isPwaStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (window.matchMedia?.('(display-mode: fullscreen)').matches ?? false) ||
    !!(window.navigator as Navigator & { standalone?: boolean }).standalone
  )
}

/** Heuristic for Mobile Safari–style installs (Share → Add to Home Screen). */
export function isIosSafariInstallHintEligible(): boolean {
  if (typeof window === 'undefined') return false
  const ua = window.navigator.userAgent
  const iOSLike =
    /iPad|iPhone|iPod/.test(ua) ||
    (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1)
  const chromeOrFirefoxIos = /CriOS|FxiOS|EdgiOS/.test(ua)
  const webKitApple = window.navigator.vendor.includes('Apple')
  return iOSLike && webKitApple && !chromeOrFirefoxIos
}

/**
 * Tracks install prompt availability globally and Chromium `beforeinstallprompt`.
 */
export function usePwaInstall(): {
  standalone: boolean
  canPrompt: boolean
  showIosInstallHint: boolean
  promptInstall: () => Promise<PwaPromptOutcome>
} {
  const standalone = useSyncExternalStore(subscribeStandalone, snapshotStandalone, () => false)
  const canPrompt = useSyncExternalStore(subscribeDeferredPromptAvailability, snapshotCanPrompt, () => false)

  const promptInstall = useCallback(async (): Promise<PwaPromptOutcome> => {
    if (standalone) return 'unavailable'
    const deferred = deferredBeforeInstall
    if (!deferred) return 'unavailable'
    await deferred.prompt()
    const choice = await deferred.userChoice
    deferredBeforeInstall = null
    notifyDeferredPromptSubscribers()
    return choice.outcome === 'accepted' ? 'accepted' : 'dismissed'
  }, [standalone])

  const showIosInstallHint = isIosSafariInstallHintEligible() && !standalone

  return {
    standalone,
    canPrompt,
    showIosInstallHint,
    promptInstall,
  }
}

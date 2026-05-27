/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  /** Base URL for FastAPI (no trailing slash). Optional when using mock API. */
  readonly VITE_API_BASE_URL?: string
  /** Set to `"true"` to use the in-browser mock API (no backend required). */
  readonly VITE_USE_MOCK_API?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.svg?url' {
  const src: string
  export default src
}

/** Chromium install prompt (narrow typing for Safari / older TS libs). */
interface BeforeInstallPromptEvent extends Event {
  readonly platforms?: string[]
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
  prompt(): Promise<void>
}

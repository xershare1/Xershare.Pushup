/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** PushupPros product app origin (no trailing slash), e.g. http://localhost:5174 */
  readonly VITE_CHALLENGE_APP_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

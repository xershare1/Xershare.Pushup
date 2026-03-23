/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL for FastAPI (no trailing slash). Optional when using mock API. */
  readonly VITE_API_BASE_URL?: string
  /** Set to `"true"` to use the in-browser mock API (no backend required). */
  readonly VITE_USE_MOCK_API?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  /** Transitional machine/dev only — prefer JWT via login */
  readonly VITE_API_KEY?: string
  readonly VITE_WS_URL?: string
  readonly VITE_USE_MOCKS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

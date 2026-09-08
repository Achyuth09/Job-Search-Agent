/// <reference types="vite/client" />

declare const process: { env: Record<string, string | undefined> };

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface ImportMetaEnv {
  readonly DEV: boolean
  readonly PROD: boolean
  readonly MODE: string
}

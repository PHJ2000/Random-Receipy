/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_KOREAN_RECIPES_SERVICE_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

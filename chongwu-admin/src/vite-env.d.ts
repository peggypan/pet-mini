/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TCB_ENV: string;
  readonly VITE_TCB_ACCESS_KEY?: string;
  readonly VITE_TCB_REGION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

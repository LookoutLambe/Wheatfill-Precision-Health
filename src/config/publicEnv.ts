/**
 * Build-time Vite env in one place (import.meta.env is otherwise scattered).
 * Add new `VITE_*` keys here when pages need them.
 */
export type VitePublicEnv = {
  MODE: string
  DEV: boolean
  PROD: boolean
  VITE_MARKETING_ONLY?: string
  VITE_APP_URL?: string
  VITE_API_URL?: string
}

export const vitePublicEnv: VitePublicEnv = {
  MODE: import.meta.env.MODE,
  DEV: import.meta.env.DEV,
  PROD: import.meta.env.PROD,
  VITE_MARKETING_ONLY: import.meta.env.VITE_MARKETING_ONLY,
  VITE_APP_URL: import.meta.env.VITE_APP_URL,
  VITE_API_URL: import.meta.env.VITE_API_URL,
}

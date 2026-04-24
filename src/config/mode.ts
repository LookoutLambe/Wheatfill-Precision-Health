export const MARKETING_ONLY = (import.meta.env.VITE_MARKETING_ONLY?.toString().trim() || '') === '1'

export const APP_URL = (import.meta.env.VITE_APP_URL?.toString().trim() || '').replace(/\/$/, '')


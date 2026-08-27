/**
 * First-touch marketing attribution (client-side).
 *
 * On the first public page view we persist the acquisition context (UTM
 * params, click ids, landing page, referrer) in a cookie. Lead submissions
 * attach it (plus Meta's _fbp/_fbc cookies when a Pixel is active — BP-6)
 * so every lead answers "which ad/campaign brought this person?".
 * First-touch only: an existing cookie is never overwritten.
 */

const COOKIE_NAME = 'bp_attribution'
const COOKIE_TTL_DAYS = 90

const PARAM_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'fbclid',
  'gclid',
] as const

export type Attribution = Partial<Record<(typeof PARAM_KEYS)[number], string>> & {
  landing_page?: string
  referrer?: string
  fbp?: string
  fbc?: string
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`))
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null
}

/** Capture first-touch context. Call once per page view on public pages. */
export function captureAttribution(): void {
  if (typeof window === 'undefined') return
  if (readCookie(COOKIE_NAME)) return // first touch already recorded

  const params = new URLSearchParams(window.location.search)
  const data: Attribution = {}
  for (const key of PARAM_KEYS) {
    const value = params.get(key)
    if (value) data[key] = value.slice(0, 500)
  }
  data.landing_page = (window.location.pathname + window.location.search).slice(0, 500)
  if (document.referrer && !document.referrer.startsWith(window.location.origin)) {
    data.referrer = document.referrer.slice(0, 500)
  }

  // Nothing meaningful on a direct visit with no referrer? Still store the
  // landing page so "first seen" is known; it is cheap and useful.
  const expires = new Date(Date.now() + COOKIE_TTL_DAYS * 24 * 60 * 60 * 1000)
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(JSON.stringify(data))}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`
}

/** Attribution payload for a lead submission (first touch + live Meta cookies). */
export function getAttribution(): Attribution {
  let stored: Attribution = {}
  const raw = readCookie(COOKIE_NAME)
  if (raw) {
    try {
      stored = JSON.parse(raw) as Attribution
    } catch {
      stored = {}
    }
  }
  const fbp = readCookie('_fbp')
  const fbc = readCookie('_fbc')
  if (fbp) stored.fbp = fbp
  if (fbc) stored.fbc = fbc
  return stored
}

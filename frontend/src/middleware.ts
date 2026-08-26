import createMiddleware from 'next-intl/middleware'

import { routing } from './i18n/routing'

export default createMiddleware(routing)

export const config = {
  /**
   * Localize ONLY the public site. Excluded from locale routing:
   * - /api, /media (proxied to Django), Next internals, files with extensions
   * - staff/auth surfaces (English by design): /admin, /login, /dashboard,
   *   /profile, /auth, /forgot-password, /reset-password, /verify-email
   */
  matcher: [
    '/((?!api|media|_next|_vercel|admin|auth|login|dashboard|profile|forgot-password|reset-password|verify-email|.*\\..*).*)',
  ],
}

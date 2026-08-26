import { createNavigation } from 'next-intl/navigation'

import { routing } from './routing'

/**
 * Locale-aware navigation for PUBLIC pages: hrefs are written without a locale
 * prefix ("/services") and the active locale is applied automatically.
 * Non-localized app routes (/login, /admin/…) use plain next/link instead.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing)

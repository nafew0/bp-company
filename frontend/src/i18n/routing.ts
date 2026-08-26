import { defineRouting } from 'next-intl/routing'

import { DEFAULT_LOCALE, LOCALES } from './config'

export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  // Always prefix (/en/..., /bn/...): shareable deep links + clean hreflang.
  localePrefix: 'always',
  // Detection order: NEXT_LOCALE cookie, then Accept-Language, then default.
  localeDetection: true,
})

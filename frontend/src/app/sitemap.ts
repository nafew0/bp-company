import type { MetadataRoute } from 'next'

import { DEFAULT_LOCALE, LOCALES } from '@/i18n/config'
import { getBaseUrl } from '@/lib/seo'

/**
 * Public-site sitemap: every locale variant of each public path.
 * Client phases append their pages (services, funnels, …) to PUBLIC_PATHS.
 */
const PUBLIC_PATHS = ['']

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getBaseUrl()
  return PUBLIC_PATHS.flatMap((path) =>
    LOCALES.map((locale) => ({
      url: `${base}/${locale}${path}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: path === '' ? 1 : 0.7,
      alternates: {
        languages: Object.fromEntries(
          LOCALES.map((code) => [code, `${base}/${code}${path}`])
        ),
      },
    }))
  ).sort((a, b) => (a.url.includes(`/${DEFAULT_LOCALE}`) ? -1 : a.url.localeCompare(b.url)))
}

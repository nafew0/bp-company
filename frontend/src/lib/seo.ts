import type { Metadata } from 'next'

import { DEFAULT_LOCALE, LOCALES } from '@/i18n/config'
import type { SiteConfigData } from '@/lib/content'

export function getBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/+$/, '')
}

/** hreflang alternates + canonical for a localized public path ('' = home). */
export function localeAlternates(locale: string, path = ''): Metadata['alternates'] {
  const base = getBaseUrl()
  const languages = Object.fromEntries(
    LOCALES.map((code) => [code, `${base}/${code}${path}`])
  ) as Record<string, string>
  languages['x-default'] = `${base}/${DEFAULT_LOCALE}${path}`
  return {
    canonical: `${base}/${locale}${path}`,
    languages,
  }
}

/** Default page metadata from SiteConfig with sane fallbacks. */
export function buildSiteMetadata(
  config: SiteConfigData | null,
  locale: string,
  fallbackTitle: string,
  path = ''
): Metadata {
  const siteName = config?.site_name || fallbackTitle
  const title = config?.meta.title || (config?.tagline ? `${siteName} — ${config.tagline}` : siteName)
  const description = config?.meta.description || config?.tagline || ''
  return {
    title,
    description: description || undefined,
    alternates: localeAlternates(locale, path),
    openGraph: {
      title,
      description: description || undefined,
      siteName,
      type: 'website',
      url: `${getBaseUrl()}/${locale}${path}`,
    },
  }
}

/** Schema.org LocalBusiness JSON-LD object built from SiteConfig. */
export function localBusinessJsonLd(config: SiteConfigData, locale: string): Record<string, unknown> {
  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: config.site_name,
    url: `${getBaseUrl()}/${locale}`,
  }
  if (config.meta.description || config.tagline) {
    jsonLd.description = config.meta.description || config.tagline
  }
  if (config.phone_primary) jsonLd.telephone = config.phone_primary
  if (config.email) jsonLd.email = config.email
  if (config.address) jsonLd.address = config.address
  if (config.hours) jsonLd.openingHours = config.hours
  const sameAs = Object.values(config.social).filter(Boolean)
  if (sameAs.length > 0) jsonLd.sameAs = sameAs
  return jsonLd
}

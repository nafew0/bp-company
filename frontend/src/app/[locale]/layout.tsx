import { hasLocale, NextIntlClientProvider } from 'next-intl'
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import AttributionTracker from '@/components/site/AttributionTracker'
import LocaleFrame from '@/components/site/LocaleFrame'
import SiteFooter from '@/components/site/SiteFooter'
import SiteNavbar from '@/components/site/SiteNavbar'
import { getServices, getSiteConfig } from '@/lib/content'
import { routing } from '@/i18n/routing'
import type { AppLocale } from '@/i18n/config'

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) {
    notFound()
  }
  setRequestLocale(locale)
  const [messages, t, config, services] = await Promise.all([
    getMessages(),
    getTranslations({ locale, namespace: 'nav' }),
    getSiteConfig(locale),
    getServices(locale),
  ])
  const tFooter = await getTranslations({ locale, namespace: 'footer' })

  const siteName = config?.site_name || 'BP-Company'
  const navLinks = [
    { href: '/#services', label: t('services') },
    { href: '/#testimonials', label: t('testimonials') },
    { href: '/#faq', label: t('faq') },
    { href: '/#contact', label: t('contact') },
  ]

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <LocaleFrame locale={locale as AppLocale}>
        <AttributionTracker />
        <SiteNavbar
          siteName={siteName}
          links={navLinks}
          cta={{ href: '/#contact', label: t('cta') }}
        />
        {children}
        <SiteFooter
          config={config}
          quickLinks={navLinks.map((link) => ({ ...link }))}
          serviceLinks={services.slice(0, 6).map((service) => ({
            href: '/#services',
            label: service.name,
          }))}
          labels={{
            quickLinks: tFooter('quickLinks'),
            services: tFooter('services'),
            contact: tFooter('contact'),
            follow: tFooter('follow'),
            rights: tFooter('rights'),
          }}
        />
      </LocaleFrame>
    </NextIntlClientProvider>
  )
}

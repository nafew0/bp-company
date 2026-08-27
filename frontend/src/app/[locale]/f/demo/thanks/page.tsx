import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { CheckCircle2, MessageCircle } from 'lucide-react'

import Button from '@/components/site/Button'
import Container from '@/components/site/Container'
import FunnelPage from '@/components/site/FunnelPage'
import Section from '@/components/site/Section'
import { getSiteConfig, whatsappLink } from '@/lib/content'

export const metadata: Metadata = {
  title: 'Thank you — BP-Company',
  robots: { index: false },
}

/** Funnel thank-you step: reference number + WhatsApp handoff. */
export default async function DemoFunnelThanksPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ ref?: string }>
}) {
  const { locale } = await params
  const { ref } = await searchParams
  setRequestLocale(locale)
  const [t, config] = await Promise.all([
    getTranslations({ locale, namespace: 'funnel.thanks' }),
    getSiteConfig(locale),
  ])
  const whatsapp = config
    ? whatsappLink(config.whatsapp_number, ref ? t('whatsappPrefill', { reference: ref }) : undefined)
    : null

  return (
    <FunnelPage funnelId="demo-funnel" step="thanks">
      <main>
        <Section tone="base" className="pt-20">
          <Container width="tight" className="text-center" data-testid="funnel-thanks">
            <CheckCircle2 className="mx-auto h-14 w-14 text-status-success" strokeWidth={1.5} aria-hidden />
            <h1 className="mt-5 text-headline-md">{t('title')}</h1>
            <p className="mt-3 text-body-lg text-ink-secondary">{t('body')}</p>
            {ref ? (
              <p className="mt-5 inline-block rounded-token-md bg-surface-alt px-4 py-2 font-code text-body text-ink" data-testid="funnel-reference">
                {ref}
              </p>
            ) : null}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              {whatsapp ? (
                <a
                  href={whatsapp}
                  target="_blank"
                  rel="noreferrer"
                  data-testid="funnel-whatsapp"
                  className="inline-flex items-center gap-2 rounded-pill bg-status-success px-6 py-3 text-body font-medium text-ink-inverse hover:opacity-90"
                >
                  <MessageCircle className="h-5 w-5" aria-hidden />
                  {t('whatsapp')}
                </a>
              ) : null}
              <Button href="/" variant="secondary">
                {t('backHome')}
              </Button>
            </div>
          </Container>
        </Section>
      </main>
    </FunnelPage>
  )
}

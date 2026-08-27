import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { BadgeCheck, Clock, ShieldCheck } from 'lucide-react'

import Card from '@/components/site/Card'
import Container from '@/components/site/Container'
import Eyebrow from '@/components/site/Eyebrow'
import FunnelPage from '@/components/site/FunnelPage'
import LeadForm from '@/components/site/LeadForm'
import Reveal from '@/components/site/Reveal'
import Section from '@/components/site/Section'
import { getServices } from '@/lib/content'

export const metadata: Metadata = {
  title: 'Free Quote — BP-Company',
  robots: { index: false }, // funnels are ad landing pages, not organic pages
}

/**
 * Reference funnel ("demo"): landing promise → benefits → lead form.
 * The template's copy-paste starting point for client funnels.
 */
export default async function DemoFunnelPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const [t, services] = await Promise.all([
    getTranslations({ locale, namespace: 'funnel.demo' }),
    getServices(locale),
  ])

  const benefits = [
    { Icon: BadgeCheck, title: t('benefit1Title'), body: t('benefit1Body') },
    { Icon: Clock, title: t('benefit2Title'), body: t('benefit2Body') },
    { Icon: ShieldCheck, title: t('benefit3Title'), body: t('benefit3Body') },
  ]

  return (
    <FunnelPage funnelId="demo-funnel" step="landing">
      <main>
        <Section tone="base" className="pt-14 md:pt-20">
          <Container width="wide" className="text-center">
            <Reveal>
              <Eyebrow>{t('eyebrow')}</Eyebrow>
              <h1 className="mx-auto mt-3 max-w-3xl text-hero-sm" data-testid="funnel-headline">
                {t('headline')}
              </h1>
              <p className="mx-auto mt-4 max-w-content-tight text-body-xl text-ink-secondary">
                {t('subheadline')}
              </p>
            </Reveal>
          </Container>
        </Section>

        <Section tone="alt" padded={false} className="py-10">
          <Container>
            <Reveal stagger className="grid gap-6 md:grid-cols-3">
              {benefits.map(({ Icon, title, body }) => (
                <Card key={title} className="text-center">
                  <Icon className="mx-auto h-8 w-8 text-brand-500" strokeWidth={1.5} aria-hidden />
                  <p className="mt-3 text-title-md text-ink">{title}</p>
                  <p className="mt-1 text-body-sm text-ink-secondary">{body}</p>
                </Card>
              ))}
            </Reveal>
          </Container>
        </Section>

        <Section tone="base" id="form">
          <Container width="narrow">
            <div className="text-center">
              <h2 className="text-headline-sm">{t('formTitle')}</h2>
              <p className="mt-2 text-body text-ink-secondary">{t('formSub')}</p>
            </div>
            <div className="mx-auto mt-8 max-w-xl">
              <LeadForm
                source="demo-funnel"
                services={services.map((service) => ({ slug: service.slug, name: service.name }))}
                successHref="/f/demo/thanks"
                showConsent
              />
              <p className="mt-4 text-center text-caption text-ink-tertiary">{t('trustNote')}</p>
            </div>
          </Container>
        </Section>
      </main>
    </FunnelPage>
  )
}

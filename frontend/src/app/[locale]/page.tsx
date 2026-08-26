import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import ContactSection from '@/components/site/sections/ContactSection'
import FaqSection from '@/components/site/sections/FaqSection'
import HeroSection from '@/components/site/sections/HeroSection'
import ServicesSection from '@/components/site/sections/ServicesSection'
import TestimonialsSection from '@/components/site/sections/TestimonialsSection'
import SectionDivider from '@/components/site/SectionDivider'
import { getFaq, getServices, getSiteConfig, getTestimonials } from '@/lib/content'
import { buildSiteMetadata, localBusinessJsonLd } from '@/lib/seo'

export const revalidate = 60

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const config = await getSiteConfig(locale)
  return buildSiteMetadata(config, locale, 'BP-Company')
}

/**
 * Template demo home ("Acme Services") — the living reference for client
 * sites: hero → services → testimonials → FAQ → contact/map, every section
 * CMS-driven and collapsing when its data is empty.
 */
export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  const [t, config, services, testimonials, faq] = await Promise.all([
    getTranslations({ locale }),
    getSiteConfig(locale),
    getServices(locale),
    getTestimonials(locale),
    getFaq(locale),
  ])

  return (
    <main>
      {config ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd(config, locale)) }}
        />
      ) : null}

      <HeroSection
        eyebrow={t('hero.eyebrow')}
        headline={t('hero.headline')}
        subheadline={config?.tagline || t('hero.subheadline')}
        primaryCta={{ href: '/#contact', label: t('hero.primaryCta') }}
        secondaryCta={{ href: '/#services', label: t('hero.secondaryCta') }}
      />

      <ServicesSection
        id="services"
        eyebrow={t('sections.services.eyebrow')}
        headline={t('sections.services.headline')}
        services={services}
      />

      <TestimonialsSection
        id="testimonials"
        eyebrow={t('sections.testimonials.eyebrow')}
        headline={t('sections.testimonials.headline')}
        testimonials={testimonials}
      />

      <SectionDivider />

      <FaqSection
        id="faq"
        eyebrow={t('sections.faq.eyebrow')}
        headline={t('sections.faq.headline')}
        items={faq}
      />

      <ContactSection
        id="contact"
        eyebrow={t('sections.contact.eyebrow')}
        headline={t('sections.contact.headline')}
        config={config}
        labels={{
          whatsapp: t('contact.whatsapp'),
          loadMap: t('contact.loadMap'),
          mapTitle: t('contact.mapTitle'),
        }}
      />
    </main>
  )
}

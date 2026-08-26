import { Clock, Mail, MapPin, MessageCircle, Phone } from 'lucide-react'

import type { SiteConfigData } from '@/lib/content'
import { whatsappLink } from '@/lib/content'
import Container from '../Container'
import ContactForm from '../ContactForm'
import Eyebrow from '../Eyebrow'
import MapEmbed from '../MapEmbed'
import Reveal from '../Reveal'
import Section from '../Section'

/**
 * Contact section: NAP + WhatsApp deep link on the left (from SiteConfig,
 * single source of truth), contact form on the right, click-to-load map below.
 */
export default function ContactSection({
  id,
  eyebrow,
  headline,
  config,
  labels,
}: {
  id?: string
  eyebrow?: string
  headline: string
  config: SiteConfigData | null
  labels: { whatsapp: string; loadMap: string; mapTitle: string }
}) {
  const whatsapp = config ? whatsappLink(config.whatsapp_number) : null

  return (
    <Section tone="alt" id={id} data-testid="contact-section">
      <Container>
        <div className="text-center">
          {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
          <h2 className="mt-2 text-headline-md md:text-headline-lg">{headline}</h2>
        </div>
        <Reveal className="mt-10 grid gap-10 lg:grid-cols-2">
          <div className="space-y-5 text-body text-ink" data-testid="contact-info">
            {config?.address ? (
              <p className="flex items-start gap-3">
                <MapPin className="mt-1 h-5 w-5 shrink-0 text-brand-500" aria-hidden />
                <span className="whitespace-pre-line">{config.address}</span>
              </p>
            ) : null}
            {config?.phone_primary ? (
              <p className="flex items-center gap-3">
                <Phone className="h-5 w-5 shrink-0 text-brand-500" aria-hidden />
                <a href={`tel:${config.phone_primary.replace(/[^+\d]/g, '')}`} className="hover:text-link">
                  {config.phone_primary}
                  {config.phone_secondary ? ` / ${config.phone_secondary}` : ''}
                </a>
              </p>
            ) : null}
            {config?.email ? (
              <p className="flex items-center gap-3">
                <Mail className="h-5 w-5 shrink-0 text-brand-500" aria-hidden />
                <a href={`mailto:${config.email}`} className="hover:text-link">
                  {config.email}
                </a>
              </p>
            ) : null}
            {config?.hours ? (
              <p className="flex items-center gap-3">
                <Clock className="h-5 w-5 shrink-0 text-brand-500" aria-hidden />
                {config.hours}
              </p>
            ) : null}
            {whatsapp ? (
              <p>
                <a
                  href={whatsapp}
                  target="_blank"
                  rel="noreferrer"
                  data-testid="whatsapp-link"
                  className="inline-flex items-center gap-2 rounded-pill bg-status-success px-5 py-2.5 text-body-sm font-medium text-ink-inverse hover:opacity-90"
                >
                  <MessageCircle className="h-4 w-4" aria-hidden />
                  {labels.whatsapp}
                </a>
              </p>
            ) : null}
          </div>
          <div>
            <ContactForm />
          </div>
        </Reveal>
        {config?.maps_embed_url ? (
          <div className="mt-10">
            <MapEmbed embedUrl={config.maps_embed_url} loadLabel={labels.loadMap} title={labels.mapTitle} />
          </div>
        ) : null}
      </Container>
    </Section>
  )
}

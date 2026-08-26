import type { ServiceData } from '@/lib/content'
import Card from '../Card'
import Container from '../Container'
import Eyebrow from '../Eyebrow'
import ContentIcon from '../iconMap'
import Reveal from '../Reveal'
import Section from '../Section'

/** Services grid from CMS data. Collapses entirely when the list is empty. */
export default function ServicesSection({
  id,
  eyebrow,
  headline,
  services,
}: {
  id?: string
  eyebrow?: string
  headline: string
  services: ServiceData[]
}) {
  if (services.length === 0) return null
  return (
    <Section tone="alt" id={id} data-testid="services-section">
      <Container>
        <div className="text-center">
          {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
          <h2 className="mt-2 text-headline-md md:text-headline-lg">{headline}</h2>
        </div>
        <Reveal stagger className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <Card key={service.id} hover className="text-center" data-testid="service-card">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-pill bg-brand-50 text-brand-600">
                <ContentIcon name={service.icon} className="h-7 w-7" />
              </div>
              <p className="mt-5 text-title-lg text-ink">{service.name}</p>
              <p className="mt-2 text-body-sm text-ink-secondary">{service.summary}</p>
            </Card>
          ))}
        </Reveal>
      </Container>
    </Section>
  )
}

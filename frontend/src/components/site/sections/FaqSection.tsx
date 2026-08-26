import type { FaqItemData } from '@/lib/content'
import Container from '../Container'
import Eyebrow from '../Eyebrow'
import FaqAccordion from '../FaqAccordion'
import Reveal from '../Reveal'
import Section from '../Section'

/** FAQ accordion section. Collapses when empty. */
export default function FaqSection({
  id,
  eyebrow,
  headline,
  items,
}: {
  id?: string
  eyebrow?: string
  headline: string
  items: FaqItemData[]
}) {
  if (items.length === 0) return null
  return (
    <Section tone="base" id={id} data-testid="faq-section">
      <Container width="narrow">
        <div className="text-center">
          {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
          <h2 className="mt-2 text-headline-md md:text-headline-lg">{headline}</h2>
        </div>
        <Reveal className="mt-10">
          <FaqAccordion items={items} />
        </Reveal>
      </Container>
    </Section>
  )
}

import Button from '../Button'
import Container from '../Container'
import Eyebrow from '../Eyebrow'
import Reveal from '../Reveal'
import Section from '../Section'

/** Generic hero: eyebrow, headline, sub, primary/secondary CTA pair. */
export default function HeroSection({
  eyebrow,
  headline,
  subheadline,
  primaryCta,
  secondaryCta,
}: {
  eyebrow?: string
  headline: string
  subheadline?: string
  primaryCta?: { href: string; label: string }
  secondaryCta?: { href: string; label: string }
}) {
  return (
    <Section tone="base" className="pt-16 md:pt-24">
      <Container width="wide" className="text-center">
        <Reveal>
          {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
          <h1 className="mx-auto mt-3 max-w-4xl text-hero-sm md:text-hero" data-testid="hero-headline">
            {headline}
          </h1>
          {subheadline ? (
            <p className="mx-auto mt-5 max-w-content-tight text-body-xl text-ink-secondary">
              {subheadline}
            </p>
          ) : null}
          {(primaryCta || secondaryCta) ? (
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              {primaryCta ? (
                <Button href={primaryCta.href} data-testid="hero-cta-primary">
                  {primaryCta.label}
                </Button>
              ) : null}
              {secondaryCta ? (
                <Button href={secondaryCta.href} variant="secondary" data-testid="hero-cta-secondary">
                  {secondaryCta.label}
                </Button>
              ) : null}
            </div>
          ) : null}
        </Reveal>
      </Container>
    </Section>
  )
}

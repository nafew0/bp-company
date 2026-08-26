import { Star } from 'lucide-react'

import type { TestimonialData } from '@/lib/content'
import Card from '../Card'
import Container from '../Container'
import Eyebrow from '../Eyebrow'
import Reveal from '../Reveal'
import Section from '../Section'

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${rating}/5`}>
      {Array.from({ length: 5 }, (_, index) => (
        <Star
          key={index}
          className={
            index < rating ? 'h-4 w-4 fill-status-warning text-status-warning' : 'h-4 w-4 text-shade-600'
          }
          aria-hidden
        />
      ))}
    </div>
  )
}

/** Dark testimonial section. Collapses when empty. */
export default function TestimonialsSection({
  id,
  eyebrow,
  headline,
  testimonials,
}: {
  id?: string
  eyebrow?: string
  headline: string
  testimonials: TestimonialData[]
}) {
  if (testimonials.length === 0) return null
  return (
    <Section tone="dark" id={id} data-testid="testimonials-section">
      <Container>
        <div className="text-center">
          {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
          <h2 className="mt-2 text-headline-md md:text-headline-lg">{headline}</h2>
        </div>
        <Reveal stagger className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {testimonials.slice(0, 6).map((testimonial) => (
            <Card key={testimonial.id} tone="dark" data-testid="testimonial-card">
              <Stars rating={testimonial.rating} />
              <p className="mt-4 text-body-lg leading-relaxed text-shade-100">{testimonial.body}</p>
              <p className="mt-4 text-body-sm text-ink-inverse/50">{testimonial.customer_name}</p>
            </Card>
          ))}
        </Reveal>
      </Container>
    </Section>
  )
}

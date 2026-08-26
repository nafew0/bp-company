'use client'
import { useState } from 'react'

import {
  Button,
  Card,
  Checkbox,
  Container,
  Eyebrow,
  Field,
  Input,
  Reveal,
  Section,
  SectionDivider,
  Select,
  Stepper,
  Textarea,
  useStepper,
} from '@/components/site'

const BRAND_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900] as const

const SWATCH_CLASSES: Record<number, { brand: string; accent: string }> = {
  50: { brand: 'bg-brand-50', accent: 'bg-brand-accent-50' },
  100: { brand: 'bg-brand-100', accent: 'bg-brand-accent-100' },
  200: { brand: 'bg-brand-200', accent: 'bg-brand-accent-200' },
  300: { brand: 'bg-brand-300', accent: 'bg-brand-accent-300' },
  400: { brand: 'bg-brand-400', accent: 'bg-brand-accent-400' },
  500: { brand: 'bg-brand-500', accent: 'bg-brand-accent-500' },
  600: { brand: 'bg-brand-600', accent: 'bg-brand-accent-600' },
  700: { brand: 'bg-brand-700', accent: 'bg-brand-accent-700' },
  800: { brand: 'bg-brand-800', accent: 'bg-brand-accent-800' },
  900: { brand: 'bg-brand-900', accent: 'bg-brand-accent-900' },
}

const DEMO_STEPS = [
  { id: 'one', label: 'Details' },
  { id: 'two', label: 'Options' },
  { id: 'three', label: 'Review' },
]

function StepperDemo() {
  const stepper = useStepper(DEMO_STEPS.length)
  return (
    <div className="space-y-6" data-testid="stepper-demo">
      <Stepper steps={DEMO_STEPS} activeIndex={stepper.activeIndex} onStepClick={stepper.goTo} />
      <Card>
        <p className="text-body text-ink" data-testid="stepper-active-label">
          Step {stepper.activeIndex + 1}: {DEMO_STEPS[stepper.activeIndex].label}
        </p>
      </Card>
      <div className="flex gap-3">
        <Button variant="secondary" size="sm" onClick={stepper.back} disabled={stepper.isFirst} data-testid="stepper-back">
          Back
        </Button>
        <Button size="sm" onClick={stepper.next} disabled={stepper.isLast} data-testid="stepper-next">
          Next
        </Button>
      </div>
    </div>
  )
}

function FormsDemo() {
  const [agreed, setAgreed] = useState(false)
  return (
    <form className="grid max-w-xl gap-5" onSubmit={(event) => event.preventDefault()}>
      <Field label="Full name" htmlFor="sg-name" required>
        <Input id="sg-name" placeholder="Jane Doe" />
      </Field>
      <Field label="Phone" htmlFor="sg-phone" error="Enter a valid phone number." required>
        <Input id="sg-phone" error defaultValue="01-23" data-testid="input-error" />
      </Field>
      <Field label="Service" htmlFor="sg-service" hint="What do you need help with?">
        <Select id="sg-service" defaultValue="">
          <option value="" disabled>
            Choose a service…
          </option>
          <option value="a">Service A</option>
          <option value="b">Service B</option>
        </Select>
      </Field>
      <Field label="Message" htmlFor="sg-message">
        <Textarea id="sg-message" placeholder="Tell us more…" />
      </Field>
      <Field label="Disabled" htmlFor="sg-disabled">
        <Input id="sg-disabled" disabled value="Read only" readOnly />
      </Field>
      <Checkbox
        label="I agree to be contacted about my request."
        checked={agreed}
        onChange={(event) => setAgreed(event.target.checked)}
      />
    </form>
  )
}

export default function StyleguideView() {
  return (
    <main className="font-text">
      <Section tone="base">
        <Container>
          <Eyebrow>Site kit</Eyebrow>
          <h1 className="mt-2 text-headline-lg text-ink">BP-Company Styleguide</h1>
          <p className="mt-3 max-w-content-tight text-body-lg text-ink-secondary">
            Every generic primitive rendered under the active theme tokens. Re-theme via
            <code className="font-code"> src/theme/tokens.css</code> only.
          </p>
          <p className="mt-2 font-alt-script text-body text-ink-secondary" data-testid="alt-script-sample">
            অল্টারনেট স্ক্রিপ্ট স্লট — বাংলা নমুনা টেক্সট
          </p>
        </Container>
      </Section>

      <Section tone="alt" data-testid="section-colors">
        <Container>
          <h2 className="text-headline-sm text-ink">Color scales</h2>
          <div className="mt-6 space-y-4">
            {(['brand', 'accent'] as const).map((scaleName) => (
              <div key={scaleName} className="flex flex-wrap gap-2">
                {BRAND_STEPS.map((step) => (
                  <div key={step} className="text-center">
                    <div
                      className={`h-12 w-12 rounded-token-sm ${SWATCH_CLASSES[step][scaleName]}`}
                    />
                    <span className="text-label text-ink-tertiary">{step}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <span className="rounded-pill bg-status-success px-3 py-1 text-body-sm text-ink-inverse">success</span>
            <span className="rounded-pill bg-status-warning px-3 py-1 text-body-sm text-ink-inverse">warning</span>
            <span className="rounded-pill bg-status-error px-3 py-1 text-body-sm text-ink-inverse">error</span>
            <span className="rounded-pill bg-status-info px-3 py-1 text-body-sm text-ink-inverse">info</span>
          </div>
        </Container>
      </Section>

      <Section tone="base" data-testid="section-type">
        <Container>
          <h2 className="text-headline-sm text-ink">Type scale</h2>
          <div className="mt-6 space-y-3 overflow-x-auto">
            <p className="text-hero-sm text-ink">Hero headline</p>
            <p className="text-headline-lg text-ink">Section headline</p>
            <p className="text-title-lg text-ink">Card title</p>
            <p className="text-body-lg text-ink-secondary">Lead body copy for section introductions.</p>
            <p className="text-body text-ink-secondary">Standard body text at the default reading size.</p>
            <p className="text-caption text-ink-tertiary">Caption / meta text</p>
            <p className="text-label uppercase text-ink-tertiary">Label text</p>
          </div>
        </Container>
      </Section>

      <Section tone="alt" data-testid="section-buttons">
        <Container>
          <h2 className="text-headline-sm text-ink">Buttons</h2>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <Button data-testid="btn-primary">Primary</Button>
            <Button variant="gradient" data-testid="btn-gradient">Gradient</Button>
            <Button variant="secondary" data-testid="btn-secondary">Secondary</Button>
            <Button size="sm">Small</Button>
            <Button disabled data-testid="btn-disabled">Disabled</Button>
            <Button href="/styleguide#buttons" variant="secondary" size="sm" data-testid="btn-link">
              Link button
            </Button>
          </div>
        </Container>
      </Section>

      <Section tone="dark" data-testid="section-dark">
        <Container>
          <Eyebrow>Dark section</Eyebrow>
          <h2 className="mt-2 text-headline-sm text-ink-inverse">Dark tone</h2>
          <p className="mt-3 max-w-content-tight text-body text-ink-inverse/70">
            Sections flip to the dark surface with inverse ink; cards use the dark-card surface.
          </p>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <Card tone="dark">
              <p className="text-title-md">Dark card</p>
              <p className="mt-2 text-body-sm text-ink-inverse/60">Card body on the dark surface.</p>
            </Card>
            <div>
              <Button variant="ghost-dark" data-testid="btn-ghost-dark">Ghost on dark</Button>
            </div>
          </div>
        </Container>
      </Section>

      <SectionDivider />

      <Section tone="base" data-testid="section-cards">
        <Container>
          <h2 className="text-headline-sm text-ink">Cards & reveal</h2>
          <Reveal stagger className="mt-6 grid gap-6 md:grid-cols-3" data-testid="reveal-grid">
            {[1, 2, 3].map((n) => (
              <Card key={n} hover>
                <p className="text-title-md text-ink">Card {n}</p>
                <p className="mt-2 text-body-sm text-ink-secondary">Hover lifts the card via tokens.</p>
              </Card>
            ))}
          </Reveal>
        </Container>
      </Section>

      <Section tone="alt" data-testid="section-forms">
        <Container>
          <h2 className="text-headline-sm text-ink">Form controls</h2>
          <div className="mt-6">
            <FormsDemo />
          </div>
        </Container>
      </Section>

      <Section tone="base" data-testid="section-stepper">
        <Container>
          <h2 className="text-headline-sm text-ink">Stepper</h2>
          <div className="mt-6 max-w-content-narrow">
            <StepperDemo />
          </div>
        </Container>
      </Section>
    </main>
  )
}

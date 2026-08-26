/**
 * BP-Company public site kit — generic, token-driven primitives.
 * Rules: no hardcoded colors (tokens only via the Tailwind preset),
 * no client-specific strings. See SYNC_GATE.md before editing.
 */
export { default as Button } from './Button'
export { default as Card } from './Card'
export { default as Container } from './Container'
export { default as Eyebrow } from './Eyebrow'
export { default as Reveal } from './Reveal'
export { default as Section } from './Section'
export type { SectionTone } from './Section'
export { default as SectionDivider } from './SectionDivider'
export { default as Stepper, useStepper } from './Stepper'
export type { StepDefinition } from './Stepper'
export { Checkbox, Field, Input, Select, Textarea } from './forms'

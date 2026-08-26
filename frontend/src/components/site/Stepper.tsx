'use client'
import { useCallback, useState } from 'react'

import { cn } from '@/lib/utils'

export interface StepDefinition {
  id: string
  label: string
}

/** Multi-step form state: current index + guarded navigation. */
export function useStepper(stepCount: number, initialIndex = 0) {
  const [activeIndex, setActiveIndex] = useState(initialIndex)

  const next = useCallback(
    () => setActiveIndex((index) => Math.min(index + 1, stepCount - 1)),
    [stepCount]
  )
  const back = useCallback(() => setActiveIndex((index) => Math.max(index - 1, 0)), [])
  const goTo = useCallback(
    (index: number) => setActiveIndex(Math.min(Math.max(index, 0), stepCount - 1)),
    [stepCount]
  )

  return {
    activeIndex,
    next,
    back,
    goTo,
    isFirst: activeIndex === 0,
    isLast: activeIndex === stepCount - 1,
  }
}

/**
 * Step indicator chrome for wizards (booking/lead funnels).
 * Presentational: pair with useStepper (or external state) for navigation.
 */
export default function Stepper({
  steps,
  activeIndex,
  onStepClick,
  className,
}: {
  steps: StepDefinition[]
  activeIndex: number
  /** Enable jumping to a previous (already visited) step by clicking it. */
  onStepClick?: (index: number) => void
  className?: string
}) {
  return (
    <ol className={cn('flex items-center gap-2', className)} data-testid="stepper">
      {steps.map((step, index) => {
        const state =
          index < activeIndex ? 'done' : index === activeIndex ? 'active' : 'todo'
        const clickable = Boolean(onStepClick) && index < activeIndex
        return (
          <li key={step.id} className="flex min-w-0 flex-1 items-center gap-2">
            <button
              type="button"
              data-state={state}
              disabled={!clickable}
              onClick={clickable ? () => onStepClick?.(index) : undefined}
              aria-current={state === 'active' ? 'step' : undefined}
              className={cn(
                'flex min-w-0 flex-1 flex-col items-center gap-1.5 rounded-token-sm px-1 py-2',
                clickable && 'cursor-pointer',
                !clickable && 'cursor-default'
              )}
            >
              <span
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-pill text-body-sm font-semibold transition-colors duration-fast',
                  state === 'active' && 'bg-brand-500 text-ink-inverse',
                  state === 'done' && 'bg-brand-100 text-brand-700',
                  state === 'todo' && 'bg-surface-alt text-ink-tertiary'
                )}
              >
                {index + 1}
              </span>
              <span
                className={cn(
                  'w-full truncate text-center text-caption',
                  state === 'active' ? 'font-semibold text-ink' : 'text-ink-secondary'
                )}
              >
                {step.label}
              </span>
            </button>
            {index < steps.length - 1 ? (
              <span aria-hidden className="h-px w-4 shrink-0 bg-shade-200 md:w-8" />
            ) : null}
          </li>
        )
      })}
    </ol>
  )
}

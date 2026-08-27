'use client'
import { useEffect } from 'react'

import { trackFunnelEvent } from '@/lib/funnel'

/**
 * Wrapper for funnel steps: tags the DOM with the funnel/step identity and
 * fires the step_view hook (wired to real analytics in the marketing phase).
 * Attribution is captured globally by AttributionTracker.
 */
export default function FunnelPage({
  funnelId,
  step,
  children,
}: {
  funnelId: string
  step: string
  children: React.ReactNode
}) {
  useEffect(() => {
    trackFunnelEvent(funnelId, 'step_view', { step })
  }, [funnelId, step])

  return (
    <div data-funnel={funnelId} data-funnel-step={step}>
      {children}
    </div>
  )
}

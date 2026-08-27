/**
 * Funnel analytics hook points. BP-4 ships them as no-ops; the marketing
 * module (BP-6) wires them to the data layer / Pixel / CAPI without touching
 * funnel pages again.
 */

export type FunnelEvent = 'step_view' | 'form_submit' | 'lead_created'

export function trackFunnelEvent(
  funnelId: string,
  event: FunnelEvent,
  data: Record<string, unknown> = {}
): void {
  if (process.env.NODE_ENV !== 'production') {
    console.debug('[funnel]', funnelId, event, data)
  }
}

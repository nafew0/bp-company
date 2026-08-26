'use client'
import { useState } from 'react'
import { MapPin } from 'lucide-react'

/**
 * Privacy-friendly map: renders a click-to-load placeholder and only embeds
 * the Google Maps iframe after an explicit user action (no third-party
 * requests before interaction; full consent banner arrives in a later phase).
 */
export default function MapEmbed({
  embedUrl,
  loadLabel,
  title,
}: {
  embedUrl: string
  loadLabel: string
  title: string
}) {
  const [loaded, setLoaded] = useState(false)

  if (!embedUrl) return null

  if (!loaded) {
    return (
      <button
        type="button"
        onClick={() => setLoaded(true)}
        data-testid="map-load-button"
        className="flex h-72 w-full flex-col items-center justify-center gap-3 rounded-token-xl border border-shade-200 bg-surface-alt text-ink-secondary transition-colors duration-fast hover:border-brand-500 hover:text-ink"
      >
        <MapPin className="h-8 w-8" aria-hidden />
        <span className="text-body-sm font-medium">{loadLabel}</span>
      </button>
    )
  }

  return (
    <iframe
      src={embedUrl}
      title={title}
      data-testid="map-iframe"
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
      className="h-72 w-full rounded-token-xl border-0"
    />
  )
}

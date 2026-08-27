'use client'
import { useEffect } from 'react'

import { captureAttribution } from '@/lib/attribution'

/** Mounted once in the public layout: records first-touch attribution. */
export default function AttributionTracker() {
  useEffect(() => {
    captureAttribution()
  }, [])
  return null
}

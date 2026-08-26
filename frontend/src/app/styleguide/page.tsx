import { notFound } from 'next/navigation'

import StyleguideView from '@/views/Styleguide'

export const metadata = { title: 'Styleguide — BP-Company', robots: { index: false } }

/**
 * Dev/QA-only rendering of the site kit under the current theme tokens.
 * Enabled via NEXT_PUBLIC_ENABLE_STYLEGUIDE=1 (dev + CI e2e); 404 otherwise.
 */
export default function StyleguidePage() {
  if (process.env.NEXT_PUBLIC_ENABLE_STYLEGUIDE !== '1') {
    notFound()
  }
  return <StyleguideView />
}

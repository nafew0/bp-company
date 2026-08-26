import { setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import StyleguideView from '@/views/Styleguide'

export const metadata = { title: 'Styleguide — BP-Company', robots: { index: false } }

/**
 * Dev/QA-only rendering of the site kit under the current theme tokens.
 * Enabled via NEXT_PUBLIC_ENABLE_STYLEGUIDE=1 (dev + CI e2e); 404 otherwise.
 * Locale-routed so the kit can be QA'd under every enabled locale/font.
 */
export default async function StyleguidePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  if (process.env.NEXT_PUBLIC_ENABLE_STYLEGUIDE !== '1') {
    notFound()
  }
  const { locale } = await params
  setRequestLocale(locale)
  return <StyleguideView />
}

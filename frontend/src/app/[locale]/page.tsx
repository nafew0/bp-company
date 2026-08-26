import { setRequestLocale } from 'next-intl/server'

import Home from '@/views/Home'

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  return <Home />
}

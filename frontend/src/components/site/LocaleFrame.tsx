'use client'
import { useEffect } from 'react'

import { cn } from '@/lib/utils'
import { ALT_SCRIPT_LOCALES, type AppLocale } from '@/i18n/config'

/**
 * Wraps every public (localized) page: declares the content language for
 * assistive tech/SEO via `lang`, applies the alt-script font slot for
 * non-Latin locales, and syncs <html lang> after hydration.
 */
export default function LocaleFrame({
  locale,
  children,
}: {
  locale: AppLocale
  children: React.ReactNode
}) {
  const altScript = ALT_SCRIPT_LOCALES.includes(locale)

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  return (
    <div
      lang={locale}
      data-testid="locale-frame"
      className={cn('contents', altScript ? 'font-alt-script' : 'font-text')}
    >
      {children}
    </div>
  )
}

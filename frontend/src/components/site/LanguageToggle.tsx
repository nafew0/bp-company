'use client'
import { useLocale, useTranslations } from 'next-intl'

import { cn } from '@/lib/utils'
import { LOCALES, LOCALE_LABELS, type AppLocale } from '@/i18n/config'
import { usePathname, useRouter } from '@/i18n/navigation'

/**
 * Public-site language switcher. Preserves the current path and query, and the
 * middleware persists the choice in the NEXT_LOCALE cookie. Renders nothing
 * when only one locale is enabled.
 */
export default function LanguageToggle({ className }: { className?: string }) {
  const t = useTranslations('languageToggle')
  const activeLocale = useLocale()
  const pathname = usePathname()
  const router = useRouter()

  if (LOCALES.length < 2) return null

  return (
    <nav aria-label={t('ariaLabel')} data-testid="language-toggle" className={cn('flex items-center gap-1', className)}>
      {LOCALES.map((locale) => {
        const isActive = locale === activeLocale
        return (
          <button
            key={locale}
            type="button"
            lang={locale}
            disabled={isActive}
            aria-current={isActive ? 'true' : undefined}
            data-testid={`language-option-${locale}`}
            onClick={() => router.replace(pathname, { locale })}
            className={cn(
              'rounded-pill px-3 py-1 text-body-sm transition-colors duration-fast',
              isActive
                ? 'bg-brand-500 font-semibold text-ink-inverse'
                : 'cursor-pointer text-ink-secondary hover:bg-surface-alt hover:text-ink'
            )}
          >
            {LOCALE_LABELS[locale as AppLocale]}
          </button>
        )
      })}
    </nav>
  )
}

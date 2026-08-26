/**
 * Enabled locales for the PUBLIC site — the per-client i18n entrypoint.
 *
 * A client site edits THIS file (plus messages/<locale>.json) to change
 * languages. A single-locale client ships `LOCALES = ['en']` — the language
 * toggle hides itself automatically.
 *
 * The admin panel and auth screens are intentionally NOT localized (English,
 * staff-facing) and live outside the [locale] routing segment.
 */
export const LOCALES = ['en', 'bn'] as const

export type AppLocale = (typeof LOCALES)[number]

export const DEFAULT_LOCALE: AppLocale = 'en'

/** Native-script display names, shown in the language toggle (never translated). */
export const LOCALE_LABELS: Record<AppLocale, string> = {
  en: 'English',
  bn: 'বাংলা',
}

/** Locales whose text should render with the alt-script font slot (see tokens.css). */
export const ALT_SCRIPT_LOCALES: readonly AppLocale[] = ['bn']

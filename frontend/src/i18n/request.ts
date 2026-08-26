import { hasLocale } from 'next-intl'
import { getRequestConfig } from 'next-intl/server'

import { routing } from './routing'

type Messages = Record<string, unknown>

/**
 * Deep-merge locale messages over the English base so a missing key falls back
 * to English instead of rendering a raw key. (Missing keys are additionally
 * logged by next-intl in development.)
 */
function mergeMessages(base: Messages, override: Messages): Messages {
  const result: Messages = { ...base }
  for (const [key, value] of Object.entries(override)) {
    const baseValue = result[key]
    if (
      value &&
      baseValue &&
      typeof value === 'object' &&
      typeof baseValue === 'object' &&
      !Array.isArray(value) &&
      !Array.isArray(baseValue)
    ) {
      result[key] = mergeMessages(baseValue as Messages, value as Messages)
    } else {
      result[key] = value
    }
  }
  return result
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale

  const enMessages = (await import('../../messages/en.json')).default as Messages
  const messages =
    locale === routing.defaultLocale
      ? enMessages
      : mergeMessages(
          enMessages,
          (await import(`../../messages/${locale}.json`)).default as Messages
        )

  return { locale, messages }
})

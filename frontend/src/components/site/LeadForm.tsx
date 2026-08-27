'use client'
import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'

import { getAttribution } from '@/lib/attribution'
import { trackFunnelEvent } from '@/lib/funnel'
import { useRouter } from '@/i18n/navigation'
import Button from './Button'
import { Checkbox, Field, Input, Select, Textarea } from './forms'

interface ServiceOption {
  slug: string
  name: string
}

type SubmitState = 'idle' | 'pending' | 'success' | 'error'

/**
 * Generic lead-capture form → POST /api/leads/capture/.
 * Attaches first-touch attribution, the funnel/form `source`, the active
 * locale, and a honeypot. On success either routes to `successHref?ref=…`
 * (funnel thank-you step) or renders an inline success state.
 */
export default function LeadForm({
  source,
  services,
  defaultServiceSlug,
  showMessage = true,
  showConsent = false,
  successHref,
  className,
}: {
  source: string
  services?: ServiceOption[]
  defaultServiceSlug?: string
  showMessage?: boolean
  showConsent?: boolean
  successHref?: string
  className?: string
}) {
  const t = useTranslations('leadForm')
  const locale = useLocale()
  const router = useRouter()
  const [state, setState] = useState<SubmitState>('idle')
  const [reference, setReference] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (state === 'pending') return

    const data = new FormData(event.currentTarget)
    const payload = {
      name: String(data.get('name') ?? '').trim(),
      phone: String(data.get('phone') ?? '').trim(),
      email: String(data.get('email') ?? '').trim(),
      message: showMessage ? String(data.get('message') ?? '').trim() : '',
      service: String(data.get('service') ?? defaultServiceSlug ?? ''),
      consent_marketing: showConsent ? data.get('consent') === 'on' : false,
      source,
      lang: locale,
      attribution: getAttribution(),
      website: String(data.get('website') ?? ''),
    }

    const errors: Record<string, string> = {}
    if (!payload.name) errors.name = t('errors.required')
    if (!payload.phone) errors.phone = t('errors.required')
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setState('pending')
    trackFunnelEvent(source, 'form_submit')
    try {
      const response = await fetch('/api/leads/capture/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (response.status === 201 || response.status === 200) {
        const body = (await response.json()) as { reference: string | null }
        trackFunnelEvent(source, 'lead_created', { reference: body.reference })
        if (successHref && body.reference) {
          router.push(`${successHref}?ref=${encodeURIComponent(body.reference)}`)
          return
        }
        setReference(body.reference)
        setState('success')
        return
      }
      if (response.status === 400) {
        const body = (await response.json()) as Record<string, string[]>
        const serverErrors: Record<string, string> = {}
        for (const [key, messages] of Object.entries(body)) {
          if (Array.isArray(messages) && messages[0]) serverErrors[key] = messages[0]
        }
        setFieldErrors(serverErrors)
      }
      setState('error')
    } catch {
      setState('error')
    }
  }

  if (state === 'success') {
    return (
      <div
        role="status"
        data-testid="leadform-success"
        className="rounded-token-xl border border-status-success/30 bg-status-success/10 p-8 text-center"
      >
        <p className="text-title-md text-ink">{t('successTitle')}</p>
        <p className="mt-2 text-body-sm text-ink-secondary">{t('successBody')}</p>
        {reference ? (
          <p className="mt-3 font-code text-body-sm text-ink" data-testid="leadform-reference">
            {reference}
          </p>
        ) : null}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate data-testid="lead-form" className={className}>
      <div className="grid gap-5">
        <Field label={t('name')} htmlFor="lead-name" required error={fieldErrors.name}>
          <Input id="lead-name" name="name" autoComplete="name" error={Boolean(fieldErrors.name)} />
        </Field>
        <Field label={t('phone')} htmlFor="lead-phone" required error={fieldErrors.phone}>
          <Input
            id="lead-phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="01XXXXXXXXX"
            error={Boolean(fieldErrors.phone)}
          />
        </Field>
        <Field label={t('email')} htmlFor="lead-email" error={fieldErrors.email} hint={t('emailHint')}>
          <Input id="lead-email" name="email" type="email" autoComplete="email" error={Boolean(fieldErrors.email)} />
        </Field>
        {services && services.length > 0 ? (
          <Field label={t('service')} htmlFor="lead-service">
            <Select id="lead-service" name="service" defaultValue={defaultServiceSlug ?? ''}>
              <option value="">{t('servicePlaceholder')}</option>
              {services.map((service) => (
                <option key={service.slug} value={service.slug}>
                  {service.name}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}
        {showMessage ? (
          <Field label={t('message')} htmlFor="lead-message" error={fieldErrors.message}>
            <Textarea id="lead-message" name="message" error={Boolean(fieldErrors.message)} />
          </Field>
        ) : null}
        {showConsent ? <Checkbox name="consent" label={t('consent')} /> : null}

        {/* Honeypot */}
        <div aria-hidden="true" className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden">
          <label htmlFor="lead-website">Website</label>
          <input id="lead-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
        </div>

        {state === 'error' ? (
          <p role="alert" data-testid="leadform-error" className="text-body-sm text-status-error">
            {t('submitError')}
          </p>
        ) : null}

        <div>
          <Button type="submit" disabled={state === 'pending'} data-testid="leadform-submit" className="w-full sm:w-auto">
            {state === 'pending' ? t('sending') : t('submit')}
          </Button>
        </div>
      </div>
    </form>
  )
}

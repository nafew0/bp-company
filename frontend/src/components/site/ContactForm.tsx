'use client'
import { useState } from 'react'
import { useTranslations } from 'next-intl'

import Button from './Button'
import { Field, Input, Textarea } from './forms'

type SubmitState = 'idle' | 'pending' | 'success' | 'error'

/**
 * Generic contact form → POST /api/content/contact/.
 * Includes a honeypot field ("website") and a double-submit guard.
 */
export default function ContactForm() {
  const t = useTranslations('contact.form')
  const [state, setState] = useState<SubmitState>('idle')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (state === 'pending') return

    const form = event.currentTarget
    const data = new FormData(form)
    const payload = {
      name: String(data.get('name') ?? '').trim(),
      phone: String(data.get('phone') ?? '').trim(),
      email: String(data.get('email') ?? '').trim(),
      message: String(data.get('message') ?? '').trim(),
      website: String(data.get('website') ?? ''),
    }

    const errors: Record<string, string> = {}
    if (!payload.name) errors.name = t('errors.required')
    if (!payload.phone) errors.phone = t('errors.required')
    if (!payload.message) errors.message = t('errors.required')
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setState('pending')
    try {
      const response = await fetch('/api/content/contact/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (response.status === 201) {
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
        data-testid="contact-success"
        className="rounded-token-xl border border-status-success/30 bg-status-success/10 p-8 text-center"
      >
        <p className="text-title-md text-ink">{t('successTitle')}</p>
        <p className="mt-2 text-body-sm text-ink-secondary">{t('successBody')}</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate data-testid="contact-form" className="grid gap-5">
      <Field label={t('name')} htmlFor="contact-name" required error={fieldErrors.name}>
        <Input id="contact-name" name="name" autoComplete="name" error={Boolean(fieldErrors.name)} />
      </Field>
      <Field label={t('phone')} htmlFor="contact-phone" required error={fieldErrors.phone}>
        <Input
          id="contact-phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          error={Boolean(fieldErrors.phone)}
        />
      </Field>
      <Field label={t('email')} htmlFor="contact-email" error={fieldErrors.email} hint={t('emailHint')}>
        <Input
          id="contact-email"
          name="email"
          type="email"
          autoComplete="email"
          error={Boolean(fieldErrors.email)}
        />
      </Field>
      <Field label={t('message')} htmlFor="contact-message" required error={fieldErrors.message}>
        <Textarea id="contact-message" name="message" error={Boolean(fieldErrors.message)} />
      </Field>

      {/* Honeypot — hidden from humans, tempting to bots. */}
      <div aria-hidden="true" className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden">
        <label htmlFor="contact-website">Website</label>
        <input id="contact-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      {state === 'error' ? (
        <p role="alert" data-testid="contact-error" className="text-body-sm text-status-error">
          {t('submitError')}
        </p>
      ) : null}

      <div>
        <Button type="submit" disabled={state === 'pending'} data-testid="contact-submit">
          {state === 'pending' ? t('sending') : t('submit')}
        </Button>
      </div>
    </form>
  )
}

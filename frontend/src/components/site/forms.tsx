'use client'
import { useId } from 'react'

import { cn } from '@/lib/utils'

/**
 * Form controls for the public site kit (lead forms, wizards).
 * All controls: 44px min height, token radius, brand focus ring, error state.
 */

const controlBase =
  'w-full rounded-token-md border bg-surface px-4 text-body text-ink placeholder:text-ink-tertiary transition-colors duration-fast focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-surface-alt disabled:text-ink-tertiary'

const controlTone = (error?: boolean) =>
  error
    ? 'border-status-error focus:border-status-error focus:ring-status-error/20'
    : 'border-shade-200 focus:border-brand-500 focus:ring-brand-500/20'

export function Field({
  label,
  error,
  hint,
  htmlFor,
  required,
  className,
  children,
}: {
  label: string
  error?: string
  hint?: string
  htmlFor?: string
  required?: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={htmlFor} className="block text-body-sm font-medium text-ink">
        {label}
        {required ? <span className="text-status-error"> *</span> : null}
      </label>
      {children}
      {error ? (
        <p role="alert" className="text-caption text-status-error">
          {error}
        </p>
      ) : hint ? (
        <p className="text-caption text-ink-tertiary">{hint}</p>
      ) : null}
    </div>
  )
}

export function Input({
  error,
  className,
  ...props
}: { error?: boolean } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      aria-invalid={error || undefined}
      className={cn(controlBase, controlTone(error), 'h-11', className)}
      {...props}
    />
  )
}

export function Textarea({
  error,
  className,
  ...props
}: { error?: boolean } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      aria-invalid={error || undefined}
      className={cn(controlBase, controlTone(error), 'min-h-28 py-3', className)}
      {...props}
    />
  )
}

export function Select({
  error,
  className,
  children,
  ...props
}: { error?: boolean } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      aria-invalid={error || undefined}
      className={cn(controlBase, controlTone(error), 'h-11', className)}
      {...props}
    >
      {children}
    </select>
  )
}

export function Checkbox({
  label,
  error,
  className,
  id,
  ...props
}: {
  label: React.ReactNode
  error?: boolean
} & React.InputHTMLAttributes<HTMLInputElement>) {
  const autoId = useId()
  const checkboxId = id ?? autoId
  return (
    <label
      htmlFor={checkboxId}
      className={cn(
        'flex cursor-pointer items-start gap-3 text-body-sm text-ink',
        className
      )}
    >
      <input
        id={checkboxId}
        type="checkbox"
        aria-invalid={error || undefined}
        className={cn(
          'mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded border-shade-200 text-brand-500 accent-[rgb(var(--brand-500))] focus:ring-2 focus:ring-brand-500/30',
          error && 'border-status-error'
        )}
        {...props}
      />
      <span>{label}</span>
    </label>
  )
}

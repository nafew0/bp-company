import { cn } from '@/lib/utils'

/**
 * Surface card for the public site kit.
 * `tone="dark"` renders the dark-section card variant; `hover` adds the lift.
 */
export default function Card({
  tone = 'light',
  hover = false,
  className,
  children,
  ...rest
}: {
  tone?: 'light' | 'dark'
  hover?: boolean
  className?: string
  children: React.ReactNode
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-token-xl p-8',
        tone === 'light' && 'border border-shade-black/5 bg-surface text-ink shadow-card',
        tone === 'dark' && 'border border-ink-inverse/10 bg-surface-dark-card text-ink-inverse',
        hover &&
          'transition-[transform,box-shadow] duration-standard ease-decelerate hover:-translate-y-1.5 hover:shadow-card-hover motion-reduce:transition-none motion-reduce:hover:translate-y-0',
        className
      )}
      {...rest}
    >
      {children}
    </div>
  )
}

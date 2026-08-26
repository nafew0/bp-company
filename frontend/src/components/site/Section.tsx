import { cn } from '@/lib/utils'

export type SectionTone = 'base' | 'alt' | 'dark'

const toneClass: Record<SectionTone, string> = {
  base: 'bg-surface text-ink',
  alt: 'bg-surface-alt text-ink',
  dark: 'bg-surface-dark text-ink-inverse',
}

/**
 * Full-width page section with the alternating background rhythm
 * (base → alt → dark) and responsive vertical padding from tokens.
 */
export default function Section({
  tone = 'base',
  padded = true,
  className,
  children,
  ...rest
}: {
  tone?: SectionTone
  padded?: boolean
  className?: string
  children: React.ReactNode
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <section
      data-tone={tone}
      className={cn(
        toneClass[tone],
        padded &&
          'py-section-mobile md:py-section-tablet lg:py-section-desktop',
        className
      )}
      {...rest}
    >
      {children}
    </section>
  )
}

import Link from 'next/link'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-pill font-text transition-colors duration-fast ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
  {
    variants: {
      variant: {
        primary: 'bg-brand-500 text-ink-inverse hover:bg-brand-600 active:bg-brand-700',
        gradient: 'bg-gradient-brand text-shade-black hover:opacity-90',
        secondary:
          'border border-brand-500 bg-transparent text-brand-600 hover:bg-brand-500 hover:text-ink-inverse',
        'ghost-dark':
          'border border-ink-inverse/25 bg-ink-inverse/10 text-ink-inverse backdrop-blur-sm hover:bg-ink-inverse/20',
      },
      size: {
        md: 'px-6 py-3 text-body',
        sm: 'px-4 py-2 text-body-sm',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  }
)

type ButtonProps = VariantProps<typeof buttonVariants> & {
  className?: string
  children: React.ReactNode
} & (
    | ({ href: string } & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'className' | 'href'>)
    | ({ href?: undefined } & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'className'>)
  )

/** Pill button. Renders a Next <Link> when `href` is given, else a <button>. */
export default function Button({ variant, size, className, children, ...rest }: ButtonProps) {
  const classes = cn(buttonVariants({ variant, size }), className)

  if ('href' in rest && typeof rest.href === 'string') {
    const { href, ...anchorProps } = rest as { href: string } & React.AnchorHTMLAttributes<HTMLAnchorElement>
    return (
      <Link href={href} className={classes} {...anchorProps}>
        {children}
      </Link>
    )
  }

  const buttonProps = rest as React.ButtonHTMLAttributes<HTMLButtonElement>
  return (
    <button type={buttonProps.type ?? 'button'} className={classes} {...buttonProps}>
      {children}
    </button>
  )
}

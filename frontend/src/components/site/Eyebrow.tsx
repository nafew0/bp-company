import { cn } from '@/lib/utils'

/** Small uppercase category label rendered above section headlines. */
export default function Eyebrow({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <p
      className={cn(
        'text-label font-semibold uppercase tracking-wider text-brand-500',
        className
      )}
    >
      {children}
    </p>
  )
}

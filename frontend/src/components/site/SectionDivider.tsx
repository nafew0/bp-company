import { cn } from '@/lib/utils'

/** 1px brand-gradient divider between major sections. */
export default function SectionDivider({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn('mx-auto h-px w-full max-w-content-wide opacity-30 bg-gradient-brand', className)}
    />
  )
}

'use client'
import { useEffect, useRef, useState } from 'react'

import { cn } from '@/lib/utils'

/**
 * Scroll-reveal wrapper (IntersectionObserver). Animates children in when the
 * element enters the viewport; `stagger` cascades direct children.
 * Reduced-motion users see content immediately (see globals.css).
 */
export default function Reveal({
  stagger = false,
  className,
  children,
  ...rest
}: {
  stagger?: boolean
  className?: string
  children: React.ReactNode
} & React.HTMLAttributes<HTMLDivElement>) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    if (typeof IntersectionObserver === 'undefined') {
      const frame = requestAnimationFrame(() => setVisible(true))
      return () => cancelAnimationFrame(frame)
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.15 }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={cn(stagger ? 'reveal-stagger' : 'reveal', visible && 'is-visible', className)}
      {...rest}
    >
      {children}
    </div>
  )
}

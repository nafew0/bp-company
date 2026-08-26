import { ChevronDown } from 'lucide-react'

import type { FaqItemData } from '@/lib/content'

/**
 * Zero-JS accessible accordion built on native <details>/<summary>.
 */
export default function FaqAccordion({ items }: { items: FaqItemData[] }) {
  if (items.length === 0) return null
  return (
    <div className="divide-y divide-shade-100 rounded-token-xl border border-shade-100 bg-surface" data-testid="faq-accordion">
      {items.map((item) => (
        <details key={item.id} className="group px-6 py-4">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-body font-medium text-ink [&::-webkit-details-marker]:hidden">
            {item.question}
            <ChevronDown
              className="h-5 w-5 shrink-0 text-ink-tertiary transition-transform duration-fast group-open:rotate-180"
              aria-hidden
            />
          </summary>
          <p className="mt-3 text-body-sm leading-relaxed text-ink-secondary">{item.answer}</p>
        </details>
      ))}
    </div>
  )
}

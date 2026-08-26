import {
  Headset,
  LucideIcon,
  Package,
  Phone,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  Truck,
  Wrench,
  Zap,
} from 'lucide-react'

/**
 * Curated icon set for CMS-driven content (Service.icon holds one of these
 * kebab-case Lucide names). A curated map keeps the bundle tree-shakeable —
 * extend it here when a client needs more icons.
 */
const ICONS: Record<string, LucideIcon> = {
  wrench: Wrench,
  truck: Truck,
  'shield-check': ShieldCheck,
  zap: Zap,
  package: Package,
  headset: Headset,
  phone: Phone,
  settings: Settings,
  sparkles: Sparkles,
  star: Star,
}

export default function ContentIcon({
  name,
  className,
}: {
  name: string
  className?: string
}) {
  const Icon = ICONS[name] ?? Sparkles
  return <Icon className={className} strokeWidth={1.5} aria-hidden />
}

/**
 * Server-side fetchers for the content API (BP-3 contract).
 * Called from Server Components — they hit Django directly via BACKEND_URL
 * (the /api rewrite is for the browser). All fetchers fail SOFT (null/[]),
 * so pages build and render even when the backend is unreachable —
 * sections collapse instead of crashing (empty-state rule).
 */

export interface SiteConfigData {
  site_name: string
  tagline: string
  phone_primary: string
  phone_secondary: string
  email: string
  whatsapp_number: string
  address: string
  hours: string
  maps_embed_url: string
  social: { facebook: string; instagram: string; youtube: string; linkedin: string }
  meta: { title: string; description: string }
}

export interface ServiceData {
  id: number
  slug: string
  icon: string
  name: string
  summary: string
  image: string | null
}

export interface TestimonialData {
  id: number
  customer_name: string
  rating: number
  body: string
  source: string
  is_featured: boolean
}

export interface FaqItemData {
  id: number
  category: string
  question: string
  answer: string
}

const BACKEND_URL = (process.env.BACKEND_URL || 'http://localhost:8000').replace(/\/+$/, '')
const REVALIDATE_SECONDS = 60

async function fetchContent<T>(path: string, lang: string, fallback: T): Promise<T> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/content/${path}/?lang=${lang}`, {
      next: { revalidate: REVALIDATE_SECONDS },
    })
    if (!response.ok) return fallback
    return (await response.json()) as T
  } catch {
    return fallback
  }
}

export const getSiteConfig = (lang: string) =>
  fetchContent<SiteConfigData | null>('config', lang, null)

export const getServices = (lang: string) =>
  fetchContent<ServiceData[]>('services', lang, [])

export const getTestimonials = (lang: string) =>
  fetchContent<TestimonialData[]>('testimonials', lang, [])

export const getFaq = (lang: string) => fetchContent<FaqItemData[]>('faq', lang, [])

/** wa.me deep link from a digits-only number; null when unset. */
export function whatsappLink(number: string, text?: string): string | null {
  const digits = number.replace(/\D/g, '')
  if (!digits) return null
  const query = text ? `?text=${encodeURIComponent(text)}` : ''
  return `https://wa.me/${digits}${query}`
}

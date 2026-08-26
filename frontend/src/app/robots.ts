import type { MetadataRoute } from 'next'

import { getBaseUrl } from '@/lib/seo'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/admin',
        '/dashboard',
        '/profile',
        '/login',
        '/forgot-password',
        '/reset-password',
        '/verify-email',
        '/auth/',
      ],
    },
    sitemap: `${getBaseUrl()}/sitemap.xml`,
  }
}

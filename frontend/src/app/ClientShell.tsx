'use client'
import { usePathname } from 'next/navigation'

import Navbar from '@/components/Navbar'
import { LOCALES } from '@/i18n/config'

const NO_NAVBAR_PATHS = ['/forgot-password', '/reset-password', '/auth/social/callback']

/** Public (locale-routed) pages bring their own shell — no app navbar there. */
function isPublicPath(pathname: string): boolean {
  return LOCALES.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)
  )
}

export default function ClientShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? ''
  const publicPage = isPublicPath(pathname)
  const showNavbar = !publicPage && !NO_NAVBAR_PATHS.some((p) => pathname.startsWith(p))

  if (publicPage) {
    return <>{children}</>
  }

  return (
    <>
      {showNavbar && <Navbar />}
      <main className={showNavbar ? 'pt-16' : ''}>{children}</main>
    </>
  )
}

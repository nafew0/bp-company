'use client'
import { useEffect, useRef, useState } from 'react'
import { Menu, X } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Link, usePathname } from '@/i18n/navigation'
import Button from './Button'
import LanguageToggle from './LanguageToggle'

export interface NavLinkItem {
  href: string
  label: string
}

/**
 * Public-site navbar: sticky translucent bar with logo slot, links,
 * language toggle and a primary CTA. Mobile: hamburger opens a native
 * <dialog> drawer (built-in focus trap + Esc handling).
 */
export default function SiteNavbar({
  siteName,
  links,
  cta,
}: {
  siteName: string
  links: NavLinkItem[]
  cta?: NavLinkItem
}) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const pathname = usePathname()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (drawerOpen && !dialog.open) dialog.showModal()
    if (!drawerOpen && dialog.open) dialog.close()
  }, [drawerOpen])

  // Close the drawer on route change (dialog's onClose syncs the state).
  useEffect(() => {
    dialogRef.current?.close()
  }, [pathname])

  return (
    <header
      data-testid="site-navbar"
      className="sticky top-0 z-50 border-b border-shade-black/10 bg-surface/80 backdrop-blur-xl backdrop-saturate-150"
    >
      <div className="mx-auto flex h-nav max-w-content items-center justify-between gap-4 px-6 md:px-8">
        <Link href="/" className="flex items-center gap-2 font-brandface text-title-md text-ink">
          {siteName}
        </Link>

        <nav className="hidden items-center gap-7 lg:flex" aria-label={siteName}>
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-body-sm text-ink/85 transition-opacity duration-fast hover:opacity-100"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex" data-testid="navbar-desktop-actions">
          <LanguageToggle />
          {cta ? (
            <Button href={cta.href} size="sm" data-testid="navbar-cta">
              {cta.label}
            </Button>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-expanded={drawerOpen}
          data-testid="navbar-menu-button"
          className="rounded-token-sm p-2 text-ink lg:hidden"
        >
          <Menu className="h-6 w-6" aria-hidden />
          <span className="sr-only">Menu</span>
        </button>
      </div>

      <dialog
        ref={dialogRef}
        onClose={() => setDrawerOpen(false)}
        data-testid="navbar-drawer"
        className={cn(
          'm-0 h-dvh max-h-dvh w-full max-w-full bg-surface p-0 text-ink',
          'backdrop:bg-shade-black/40'
        )}
      >
        <div className="flex h-nav items-center justify-between px-6">
          <span className="font-brandface text-title-md">{siteName}</span>
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            data-testid="navbar-drawer-close"
            className="rounded-token-sm p-2"
          >
            <X className="h-6 w-6" aria-hidden />
            <span className="sr-only">Close</span>
          </button>
        </div>
        <nav className="flex flex-col gap-1 px-6 py-6" aria-label={siteName}>
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setDrawerOpen(false)}
              className="rounded-token-md px-3 py-3 text-title-md text-ink hover:bg-surface-alt"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-4 px-9">
          <LanguageToggle />
        </div>
        {cta ? (
          <div className="px-9 pt-6">
            <Button href={cta.href} className="w-full" onClick={() => setDrawerOpen(false)}>
              {cta.label}
            </Button>
          </div>
        ) : null}
      </dialog>
    </header>
  )
}

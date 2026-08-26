import type { SiteConfigData } from '@/lib/content'
import { FacebookIcon, InstagramIcon, LinkedinIcon, YoutubeIcon } from './socialIcons'
import { Link } from '@/i18n/navigation'
import LanguageToggle from './LanguageToggle'
import type { NavLinkItem } from './SiteNavbar'

/**
 * Public-site footer. NAP comes from SiteConfig (single source of truth);
 * columns collapse when their data is empty.
 */
export default function SiteFooter({
  config,
  quickLinks,
  serviceLinks,
  labels,
}: {
  config: SiteConfigData | null
  quickLinks: NavLinkItem[]
  serviceLinks: NavLinkItem[]
  labels: {
    quickLinks: string
    services: string
    contact: string
    follow: string
    rights: string
  }
}) {
  const year = new Date().getFullYear()
  const siteName = config?.site_name || 'BP-Company'
  const socials = [
    { href: config?.social.facebook, Icon: FacebookIcon, label: 'Facebook' },
    { href: config?.social.instagram, Icon: InstagramIcon, label: 'Instagram' },
    { href: config?.social.youtube, Icon: YoutubeIcon, label: 'YouTube' },
    { href: config?.social.linkedin, Icon: LinkedinIcon, label: 'LinkedIn' },
  ].filter((item) => Boolean(item.href))

  return (
    <footer data-testid="site-footer" className="bg-surface-dark-card text-ink-inverse">
      <div className="mx-auto max-w-content px-6 py-16 md:px-8">
        <div className="flex flex-wrap items-start justify-between gap-8">
          <div className="max-w-xs space-y-3">
            <p className="font-brandface text-title-lg">{siteName}</p>
            {config?.tagline ? (
              <p className="text-body-sm text-ink-inverse/60">{config.tagline}</p>
            ) : null}
            <LanguageToggle />
          </div>

          <div className="grid grid-cols-2 gap-10 md:grid-cols-3">
            {quickLinks.length > 0 ? (
              <div>
                <p className="text-label font-semibold uppercase tracking-wider text-ink-inverse/50">
                  {labels.quickLinks}
                </p>
                <ul className="mt-3 space-y-2">
                  {quickLinks.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-body-sm text-ink-inverse/80 hover:text-ink-inverse"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {serviceLinks.length > 0 ? (
              <div>
                <p className="text-label font-semibold uppercase tracking-wider text-ink-inverse/50">
                  {labels.services}
                </p>
                <ul className="mt-3 space-y-2">
                  {serviceLinks.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-body-sm text-ink-inverse/80 hover:text-ink-inverse"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div>
              <p className="text-label font-semibold uppercase tracking-wider text-ink-inverse/50">
                {labels.contact}
              </p>
              <ul className="mt-3 space-y-2 text-body-sm text-ink-inverse/80">
                {config?.phone_primary ? <li>{config.phone_primary}</li> : null}
                {config?.phone_secondary ? <li>{config.phone_secondary}</li> : null}
                {config?.email ? <li>{config.email}</li> : null}
                {config?.address ? <li className="whitespace-pre-line">{config.address}</li> : null}
                {config?.hours ? <li>{config.hours}</li> : null}
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-ink-inverse/10 pt-6">
          <p className="text-caption text-ink-inverse/50">
            © {year} {siteName}. {labels.rights}
          </p>
          {socials.length > 0 ? (
            <div className="flex items-center gap-4" aria-label={labels.follow}>
              {socials.map(({ href, Icon, label }) => (
                <a
                  key={label}
                  href={href as string}
                  target="_blank"
                  rel="noreferrer"
                  className="text-ink-inverse/60 hover:text-ink-inverse"
                >
                  <Icon className="h-5 w-5" aria-hidden />
                  <span className="sr-only">{label}</span>
                </a>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </footer>
  )
}

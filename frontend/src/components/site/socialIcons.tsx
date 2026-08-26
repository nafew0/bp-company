/**
 * Minimal inline social brand marks (lucide removed brand icons).
 * All inherit currentColor; sized via className.
 */

function SvgBase({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {children}
    </svg>
  )
}

export function FacebookIcon({ className }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path d="M13.5 21v-7h2.4l.4-3h-2.8V9.1c0-.9.3-1.5 1.6-1.5h1.3V4.9c-.3 0-1.1-.1-2-.1-2 0-3.4 1.2-3.4 3.5V11H8.5v3H11v7h2.5Z" />
    </SvgBase>
  )
}

export function InstagramIcon({ className }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path d="M12 4.3c2.5 0 2.8 0 3.8.1 1 0 1.5.2 1.9.3.5.2.8.4 1.1.7.3.3.6.7.7 1.1.1.4.3 1 .3 1.9 0 1 .1 1.3.1 3.6s0 2.6-.1 3.6c0 1-.2 1.5-.3 1.9-.2.5-.4.8-.7 1.1-.3.3-.7.6-1.1.7-.4.1-1 .3-1.9.3-1 0-1.3.1-3.8.1s-2.8 0-3.8-.1c-1 0-1.5-.2-1.9-.3a3 3 0 0 1-1.1-.7 3 3 0 0 1-.7-1.1c-.1-.4-.3-1-.3-1.9 0-1-.1-1.3-.1-3.6s0-2.6.1-3.6c0-1 .2-1.5.3-1.9.2-.5.4-.8.7-1.1.3-.3.7-.6 1.1-.7.4-.1 1-.3 1.9-.3 1-.1 1.3-.1 3.8-.1Zm0-1.6c-2.5 0-2.9 0-3.9.1-1 0-1.7.2-2.3.4-.6.3-1.2.6-1.7 1.1-.5.5-.9 1.1-1.1 1.7-.2.6-.4 1.3-.4 2.3-.1 1-.1 1.3-.1 3.9s0 2.9.1 3.9c0 1 .2 1.7.4 2.3.3.6.6 1.2 1.1 1.7.5.5 1.1.9 1.7 1.1.6.2 1.3.4 2.3.4 1 .1 1.4.1 3.9.1s2.9 0 3.9-.1c1 0 1.7-.2 2.3-.4a4.7 4.7 0 0 0 2.8-2.8c.2-.6.4-1.3.4-2.3.1-1 .1-1.4.1-3.9s0-2.9-.1-3.9c0-1-.2-1.7-.4-2.3a4.7 4.7 0 0 0-2.8-2.8c-.6-.2-1.3-.4-2.3-.4-1-.1-1.4-.1-3.9-.1Zm0 4.6a4.7 4.7 0 1 0 0 9.4 4.7 4.7 0 0 0 0-9.4Zm0 7.7a3 3 0 1 1 0-6.1 3 3 0 0 1 0 6.1Zm4.9-6.6a1.1 1.1 0 1 0 0-2.2 1.1 1.1 0 0 0 0 2.2Z" />
    </SvgBase>
  )
}

export function YoutubeIcon({ className }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path d="M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12c0 1.6.1 3.2.4 4.8.2.9.9 1.6 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8c.3-1.6.4-3.2.4-4.8 0-1.6-.1-3.2-.4-4.8ZM10 15V9l5.2 3L10 15Z" />
    </SvgBase>
  )
}

export function LinkedinIcon({ className }: { className?: string }) {
  return (
    <SvgBase className={className}>
      <path d="M4.98 3.5a2 2 0 1 1 0 4 2 2 0 0 1 0-4ZM3.5 9h3v11.5h-3V9Zm5.5 0h2.9v1.6h.1c.4-.8 1.4-1.6 2.9-1.6 3.1 0 3.7 2 3.7 4.7v6.8h-3v-6c0-1.4 0-3.2-2-3.2s-2.3 1.5-2.3 3.1v6.1H9V9Z" />
    </SvgBase>
  )
}

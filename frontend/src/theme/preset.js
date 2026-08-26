/**
 * Tailwind preset exposing the BP-Company theme tokens (src/theme/tokens.css)
 * as utility classes for the generic site kit (src/components/site/).
 *
 * Per-client re-theming changes tokens.css VALUES — this file defines NAMES and
 * should stay identical across client repos (generic; sync via SYNC_GATE.md).
 *
 * Naming avoids collisions with the shadcn/admin theme (primary, accent, muted,
 * gray, border, ring, …) which remains untouched.
 */

/** Build a 50–900 color scale reading RGB-triplet CSS vars. */
function scale(name) {
  const steps = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900]
  return Object.fromEntries(
    steps.map((step) => [step, `rgb(var(--${name}-${step}) / <alpha-value>)`])
  )
}

/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      colors: {
        brand: scale('brand'),
        'brand-accent': scale('brand-accent'),
        shade: {
          ...scale('shade'),
          0: 'rgb(var(--shade-0) / <alpha-value>)',
          black: 'rgb(var(--shade-black) / <alpha-value>)',
        },
        surface: {
          DEFAULT: 'rgb(var(--surface) / <alpha-value>)',
          alt: 'rgb(var(--surface-alt) / <alpha-value>)',
          dark: 'rgb(var(--surface-dark) / <alpha-value>)',
          'dark-card': 'rgb(var(--surface-dark-card) / <alpha-value>)',
        },
        ink: {
          DEFAULT: 'rgb(var(--ink) / <alpha-value>)',
          secondary: 'rgb(var(--ink-secondary) / <alpha-value>)',
          tertiary: 'rgb(var(--ink-tertiary) / <alpha-value>)',
          inverse: 'rgb(var(--ink-inverse) / <alpha-value>)',
        },
        link: 'rgb(var(--link) / <alpha-value>)',
        status: {
          success: 'rgb(var(--status-success) / <alpha-value>)',
          warning: 'rgb(var(--status-warning) / <alpha-value>)',
          error: 'rgb(var(--status-error) / <alpha-value>)',
          info: 'rgb(var(--status-info) / <alpha-value>)',
        },
      },
      fontFamily: {
        display: 'var(--font-display)',
        text: 'var(--font-text)',
        brandface: 'var(--font-brand)',
        'alt-script': 'var(--font-alt-script)',
        code: 'var(--font-mono)',
      },
      fontSize: {
        hero: ['var(--text-hero)', { lineHeight: '1.05', letterSpacing: '-0.015em', fontWeight: '700' }],
        'hero-sm': ['var(--text-hero-sm)', { lineHeight: '1.07', letterSpacing: '-0.012em', fontWeight: '700' }],
        'headline-xl': ['var(--text-headline-xl)', { lineHeight: '1.07', letterSpacing: '-0.005em', fontWeight: '700' }],
        'headline-lg': ['var(--text-headline-lg)', { lineHeight: '1.08', letterSpacing: '-0.003em', fontWeight: '700' }],
        'headline-md': ['var(--text-headline-md)', { lineHeight: '1.1', fontWeight: '700' }],
        'headline-sm': ['var(--text-headline-sm)', { lineHeight: '1.125', fontWeight: '700' }],
        'title-xl': ['var(--text-title-xl)', { lineHeight: '1.14', fontWeight: '600' }],
        'title-lg': ['var(--text-title-lg)', { lineHeight: '1.166', fontWeight: '600' }],
        'title-md': ['var(--text-title-md)', { lineHeight: '1.19', fontWeight: '600' }],
        'body-xl': ['var(--text-body-xl)', { lineHeight: '1.381' }],
        'body-lg': ['var(--text-body-lg)', { lineHeight: '1.421' }],
        body: ['var(--text-body)', { lineHeight: '1.47' }],
        'body-sm': ['var(--text-body-sm)', { lineHeight: '1.46' }],
        caption: ['var(--text-caption)', { lineHeight: '1.38' }],
        label: ['var(--text-label)', { lineHeight: '1.33', letterSpacing: '0.05em' }],
      },
      maxWidth: {
        content: 'var(--content-max)',
        'content-wide': 'var(--content-wide)',
        'content-narrow': 'var(--content-narrow)',
        'content-tight': 'var(--content-tight)',
      },
      borderRadius: {
        'token-sm': 'var(--radius-sm)',
        'token-md': 'var(--radius-md)',
        'token-lg': 'var(--radius-lg)',
        'token-xl': 'var(--radius-xl)',
        'token-2xl': 'var(--radius-2xl)',
        pill: 'var(--radius-pill)',
      },
      boxShadow: {
        soft: 'var(--shadow-soft)',
        card: 'var(--shadow-card)',
        raised: 'var(--shadow-raised)',
        float: 'var(--shadow-float)',
        brand: 'var(--shadow-brand)',
        'card-hover': 'var(--shadow-card-hover)',
      },
      backgroundImage: {
        'gradient-brand': 'var(--gradient-brand)',
        'gradient-brand-diagonal': 'var(--gradient-brand-diagonal)',
      },
      transitionTimingFunction: {
        standard: 'var(--ease-standard)',
        decelerate: 'var(--ease-decelerate)',
        accelerate: 'var(--ease-accelerate)',
      },
      transitionDuration: {
        micro: 'var(--duration-micro)',
        fast: 'var(--duration-fast)',
        standard: 'var(--duration-standard)',
        emphasis: 'var(--duration-emphasis)',
        slow: 'var(--duration-slow)',
      },
      spacing: {
        'section-desktop': 'var(--section-py-desktop)',
        'section-tablet': 'var(--section-py-tablet)',
        'section-mobile': 'var(--section-py-mobile)',
        nav: 'var(--nav-height)',
      },
    },
  },
}

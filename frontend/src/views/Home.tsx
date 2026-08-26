'use client'
import Link from 'next/link'
import { useTranslations } from 'next-intl'

import { LanguageToggle } from '@/components/site'
import { Button } from '@/components/ui/button'

export default function Home() {
  const t = useTranslations('home')

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-white px-4">
      <div className="mx-auto max-w-xl text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          {t('title')}
        </h1>
        <p className="mt-4 text-base leading-7 text-muted-foreground">{t('body')}</p>
        <div className="mt-8 flex items-center justify-center gap-4">
          {/* /login is a non-localized staff route — plain next/link on purpose */}
          <Button asChild className="rounded-full px-7">
            <Link href="/login">{t('loginCta')}</Link>
          </Button>
          <LanguageToggle />
        </div>
      </div>
    </div>
  )
}

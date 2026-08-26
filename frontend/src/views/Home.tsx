'use client'
import Link from 'next/link'

import { Button } from '@/components/ui/button'

export default function Home() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-white px-4">
      <div className="mx-auto max-w-xl text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          BP-Company
        </h1>
        <p className="mt-4 text-base leading-7 text-muted-foreground">
          Service-provider website template — public site arrives in Phase BP-3.
        </p>
        <div className="mt-8">
          <Button asChild className="rounded-full px-7">
            <Link href="/login">Login</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

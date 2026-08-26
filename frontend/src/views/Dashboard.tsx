'use client'
import Link from 'next/link'
import { ShieldCheck, UserRound } from 'lucide-react'

import { useAuth } from '@/contexts/AuthContext'
import useAdminAccess from '@/hooks/useAdminAccess'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function Dashboard() {
  const { user } = useAuth()
  const { canAccessAdmin } = useAdminAccess()

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {user?.first_name || user?.username || 'there'}.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {canAccessAdmin ? (
          <Link href="/admin" className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            <Card className="h-full transition hover:border-primary/40 hover:shadow-md">
              <CardHeader>
                <CardDescription className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  Administration
                </CardDescription>
                <CardTitle>Admin panel</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Manage users and platform settings.
              </CardContent>
            </Card>
          </Link>
        ) : null}

        <Link href="/profile" className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
          <Card className="h-full transition hover:border-primary/40 hover:shadow-md">
            <CardHeader>
              <CardDescription className="flex items-center gap-2">
                <UserRound className="h-4 w-4" />
                Account
              </CardDescription>
              <CardTitle>Your profile</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Update your contact details and profile photo.
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}

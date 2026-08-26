'use client'
import { useQuery } from '@tanstack/react-query'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { getAdminDashboard } from '@/services/admin'

function SummaryCard({ label, value, hint }: { label: string; value: React.ReactNode; hint: string }) {
  return (
    <Card className="theme-panel rounded-[1.6rem] border-0">
      <CardHeader className="pb-3">
        <CardDescription className="text-xs font-semibold uppercase tracking-[0.2em]">
          {label}
        </CardDescription>
        <CardTitle className="text-3xl">{value}</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">{hint}</CardContent>
    </Card>
  )
}

export default function AdminDashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: getAdminDashboard,
  })

  if (isLoading) {
    return <div className="theme-panel rounded-[1.8rem] p-6 text-sm text-muted-foreground">Loading admin overview...</div>
  }

  if (error || !data) {
    return <div className="theme-panel rounded-[1.8rem] p-6 text-sm text-rose-600">Could not load the admin dashboard right now.</div>
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <SummaryCard
          label="Total users"
          value={data.total_users}
          hint="All registered accounts."
        />
        <SummaryCard
          label="Active users"
          value={data.active_users}
          hint="Accounts that can currently sign in."
        />
        <SummaryCard
          label="Staff users"
          value={data.staff_users}
          hint="Accounts with staff access."
        />
        <SummaryCard
          label="New this week"
          value={data.new_users_this_week}
          hint="Accounts created in the last 7 days."
        />
        <SummaryCard
          label="New this month"
          value={data.new_users_this_month}
          hint="Accounts created in the last 30 days."
        />
      </div>
    </div>
  )
}

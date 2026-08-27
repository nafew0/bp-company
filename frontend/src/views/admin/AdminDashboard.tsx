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
import { getLeadSummary } from '@/services/adminLeads'

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

function LeadsSection() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-leads-summary'],
    queryFn: getLeadSummary,
  })

  if (isLoading) {
    return (
      <div className="theme-panel rounded-[1.8rem] p-6 text-sm text-muted-foreground" data-testid="dashboard-leads">
        Loading lead metrics...
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="theme-panel rounded-[1.8rem] p-6 text-sm text-muted-foreground" data-testid="dashboard-leads">
        Lead metrics are unavailable right now.
      </div>
    )
  }

  const stageTotal = data.by_stage.reduce((sum, stage) => sum + stage.count, 0)

  return (
    <div className="space-y-4" data-testid="dashboard-leads">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Leads</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Total leads" value={data.total} hint="All leads ever captured." />
        <SummaryCard label="New today" value={data.new_today} hint="Leads that arrived today." />
        <SummaryCard label="New this week" value={data.new_this_week} hint="Leads from the last 7 days." />
        <SummaryCard
          label="Conversion rate"
          value={`${Number(data.conversion_rate ?? 0).toFixed(1)}%`}
          hint="Leads reaching a converted stage."
        />
      </div>

      <Card className="theme-panel rounded-[1.6rem] border-0">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Pipeline distribution</CardTitle>
          <CardDescription>Where leads currently sit across the pipeline.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {stageTotal === 0 ? (
            <p className="text-sm text-muted-foreground">No leads in the pipeline yet.</p>
          ) : (
            <>
              <div className="flex h-3 w-full overflow-hidden rounded-full bg-[rgb(var(--theme-neutral-rgb))]">
                {data.by_stage
                  .filter((stage) => stage.count > 0)
                  .map((stage) => (
                    <div
                      key={stage.slug}
                      title={`${stage.name}: ${stage.count}`}
                      style={{
                        width: `${(stage.count / stageTotal) * 100}%`,
                        backgroundColor: stage.color || '#94a3b8',
                      }}
                    />
                  ))}
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-2">
                {data.by_stage.map((stage) => (
                  <span key={stage.slug} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                    <span
                      aria-hidden
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: stage.color || '#94a3b8' }}
                    />
                    <span className="font-medium text-foreground">{stage.name}</span>
                    {stage.count}
                  </span>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function AdminDashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: getAdminDashboard,
  })

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Users</p>
        {isLoading ? (
          <div className="theme-panel rounded-[1.8rem] p-6 text-sm text-muted-foreground">
            Loading admin overview...
          </div>
        ) : error || !data ? (
          <div className="theme-panel rounded-[1.8rem] p-6 text-sm text-rose-600">
            Could not load the admin dashboard right now.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <SummaryCard label="Total users" value={data.total_users} hint="All registered accounts." />
            <SummaryCard label="Active users" value={data.active_users} hint="Accounts that can currently sign in." />
            <SummaryCard label="Staff users" value={data.staff_users} hint="Accounts with staff access." />
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
        )}
      </div>

      <LeadsSection />
    </div>
  )
}

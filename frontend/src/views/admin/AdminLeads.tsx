'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { Columns3, Table2 } from 'lucide-react'

import { useToast } from '@/hooks/useToast'
import { Button } from '@/components/ui/button'
import { CustomSelect } from '@/components/ui/custom-select'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { getAdminUsers } from '@/services/admin'
import {
  BoardLeadCard,
  BoardStage,
  getAdminLeads,
  getErrorDetail,
  getErrorStatus,
  getLeadBoard,
  getPipelineStages,
  getStaleStageConflict,
  LeadListItem,
  moveLeadStage,
} from '@/services/adminLeads'
import { cn } from '@/lib/utils'

import { formatRelativeTime } from './admin-helpers'
import { StageChip, StageReasonDialog } from './lead-shared'

interface AdminUserRow {
  id: string
  username: string
  email?: string
  is_staff?: boolean
}

const BOARD_QUERY_KEY = ['admin-leads-board']

function updateSearchParams(
  searchParams: string,
  patch: Record<string, string>,
  router: { replace(url: string): void },
  pathname: string
) {
  const next = new URLSearchParams(searchParams)
  Object.entries(patch).forEach(([key, value]) => {
    if (!value) {
      next.delete(key)
    } else {
      next.set(key, value)
    }
  })
  if (patch.page === undefined && patch.view === undefined) {
    next.set('page', '1')
  }
  router.replace(`${pathname}?${next.toString()}`)
}

function ErrorPanel({ error, subject }: { error: unknown; subject: string }) {
  const status = getErrorStatus(error)
  const message =
    status === 403
      ? `You do not have permission to view ${subject}.`
      : `Could not load ${subject} right now.`
  return <div className="theme-panel rounded-[1.8rem] p-6 text-sm text-rose-600">{message}</div>
}

function useStaffOptions() {
  const { data } = useQuery({
    queryKey: ['admin-users', { page: '1', page_size: '100', ordering: 'username' }],
    queryFn: () => getAdminUsers({ page: '1', page_size: '100', ordering: 'username' }),
  })

  return useMemo(() => {
    const results = (data?.results || []) as AdminUserRow[]
    const hasStaffFlag = results.some((user) => user.is_staff !== undefined)
    const staff = hasStaffFlag ? results.filter((user) => user.is_staff) : results
    return staff.map((user) => ({ label: user.username, value: user.id }))
  }, [data])
}

// ---------------------------------------------------------------- Table view

function LeadsTable() {
  const router = useRouter()
  const pathname = usePathname() ?? ''
  const searchParams = useSearchParams()
  const searchParamString = searchParams?.toString() ?? ''

  const params = useMemo(() => {
    const next = new URLSearchParams(searchParamString)
    return {
      page: next.get('page') || '1',
      search: next.get('search') || '',
      stage: next.get('stage') || '',
      assigned_to: next.get('assigned_to') || '',
      date_from: next.get('date_from') || '',
      date_to: next.get('date_to') || '',
      ordering: next.get('ordering') || '-created_at',
    }
  }, [searchParamString])

  const [searchInput, setSearchInput] = useState(params.search)

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (searchInput !== params.search) {
        updateSearchParams(searchParamString, { search: searchInput }, router, pathname)
      }
    }, 350)
    return () => window.clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput])

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-leads', params],
    queryFn: () => getAdminLeads(params),
  })

  const { data: stages } = useQuery({
    queryKey: ['admin-pipeline-stages'],
    queryFn: getPipelineStages,
  })

  const staffOptions = useStaffOptions()

  const stageOptions = useMemo(
    () => [
      { label: 'All stages', value: '' },
      ...(stages || [])
        .filter((stage) => stage.is_active !== false)
        .map((stage) => ({ label: stage.name, value: stage.slug })),
    ],
    [stages]
  )

  const assigneeOptions = useMemo(
    () => [
      { label: 'All assignees', value: '' },
      { label: 'Me', value: 'me' },
      { label: 'Unassigned', value: 'none' },
      ...staffOptions,
    ],
    [staffOptions]
  )

  const columns = useMemo<ColumnDef<LeadListItem>[]>(
    () => [
      {
        accessorKey: 'reference',
        header: 'Reference',
        cell: ({ row }) => (
          <span className="font-mono text-xs font-semibold text-foreground">
            {row.original.reference}
          </span>
        ),
      },
      {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ row }) => (
          <p className="font-medium text-foreground">{row.original.name || 'Unknown'}</p>
        ),
      },
      {
        accessorKey: 'phone',
        header: 'Phone',
        cell: ({ row }) => <span className="whitespace-nowrap">{row.original.phone || '—'}</span>,
      },
      {
        accessorKey: 'service',
        header: 'Service',
        cell: ({ row }) => row.original.service?.name_en || '—',
      },
      {
        accessorKey: 'stage',
        header: 'Stage',
        cell: ({ row }) => (
          <StageChip name={row.original.stage.name} color={row.original.stage.color} />
        ),
      },
      {
        accessorKey: 'assigned_to',
        header: 'Assignee',
        cell: ({ row }) =>
          row.original.assigned_to ? (
            <span>{row.original.assigned_to.name || row.original.assigned_to.username}</span>
          ) : (
            <span className="text-muted-foreground">Unassigned</span>
          ),
      },
      {
        accessorKey: 'source',
        header: 'Source',
        cell: ({ row }) => row.original.source || '—',
      },
      {
        accessorKey: 'created_at',
        header: 'Created',
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-muted-foreground">
            {formatRelativeTime(row.original.created_at)}
          </span>
        ),
      },
    ],
    []
  )

  const table = useReactTable({
    data: data?.results || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  if (error) {
    return <ErrorPanel error={error} subject="leads" />
  }

  const currentPage = Number(params.page || 1)
  const totalPages = Math.max(1, Math.ceil((data?.count || 0) / 20))

  return (
    <Card className="theme-panel rounded-[1.8rem] border-0">
      <CardHeader className="gap-4">
        <div>
          <CardTitle>Lead queue</CardTitle>
          <CardDescription>Search, filter, and open incoming leads.</CardDescription>
        </div>
        <div className="grid gap-3 lg:grid-cols-[1.3fr_repeat(2,minmax(0,0.85fr))]">
          <Input
            data-testid="leads-search"
            placeholder="Search leads by name, phone, email, or reference"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
          <CustomSelect
            value={params.stage}
            onChange={(value) =>
              updateSearchParams(searchParamString, { stage: String(value) }, router, pathname)
            }
            options={stageOptions}
          />
          <CustomSelect
            value={params.assigned_to}
            onChange={(value) =>
              updateSearchParams(searchParamString, { assigned_to: String(value) }, router, pathname)
            }
            options={assigneeOptions}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:max-w-md">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              From
            </label>
            <Input
              type="date"
              value={params.date_from}
              onChange={(event) =>
                updateSearchParams(searchParamString, { date_from: event.target.value }, router, pathname)
              }
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              To
            </label>
            <Input
              type="date"
              value={params.date_to}
              onChange={(event) =>
                updateSearchParams(searchParamString, { date_to: event.target.value }, router, pathname)
              }
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading leads...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm" data-testid="leads-table">
              <thead className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th key={header.id} className="pb-3 pr-4">
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="py-6 text-sm text-muted-foreground">
                      No leads match the current filters.
                    </td>
                  </tr>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <tr
                      key={row.id}
                      className="cursor-pointer border-t border-[rgb(var(--theme-border-rgb)/0.7)] transition hover:bg-white/50"
                      onClick={() => router.push(`/admin/leads/${row.original.id}`)}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="py-3 pr-4 align-top">
                          {cell.column.columnDef.cell
                            ? flexRender(cell.column.columnDef.cell, cell.getContext())
                            : String(cell.getValue())}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Showing page {currentPage} of {totalPages}.
          </p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="rounded-xl"
              disabled={currentPage <= 1}
              onClick={() =>
                updateSearchParams(searchParamString, { page: String(currentPage - 1) }, router, pathname)
              }
            >
              Previous
            </Button>
            <Button
              variant="outline"
              className="rounded-xl"
              disabled={currentPage >= totalPages}
              onClick={() =>
                updateSearchParams(searchParamString, { page: String(currentPage + 1) }, router, pathname)
              }
            >
              Next
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------- Board view

interface PendingMove {
  card: BoardLeadCard
  fromStage: BoardStage
  toStage: BoardStage
}

function LeadsBoard() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const { data, isLoading, error } = useQuery({
    queryKey: BOARD_QUERY_KEY,
    queryFn: getLeadBoard,
  })

  const stages = useMemo(
    () => (data?.stages || []).slice().sort((a, b) => a.order - b.order),
    [data]
  )

  const performMove = async (move: PendingMove, reason?: string) => {
    const { card, fromStage, toStage } = move
    setSubmitting(true)

    // Optimistic move: relocate the card between columns immediately.
    queryClient.setQueryData<{ stages: BoardStage[] } | undefined>(BOARD_QUERY_KEY, (current) => {
      if (!current) return current
      return {
        stages: current.stages.map((stage) => {
          if (stage.slug === fromStage.slug) {
            return {
              ...stage,
              leads: stage.leads.filter((lead) => lead.id !== card.id),
              lead_count: Math.max(0, stage.lead_count - 1),
            }
          }
          if (stage.slug === toStage.slug) {
            return {
              ...stage,
              leads: [card, ...stage.leads],
              lead_count: stage.lead_count + 1,
            }
          }
          return stage
        }),
      }
    })

    try {
      await moveLeadStage(card.id, {
        stage: toStage.slug,
        expected_stage: fromStage.slug,
        reason: reason || undefined,
      })
      toast({
        title: 'Lead moved',
        description: `${card.reference} is now in ${toStage.name}.`,
        variant: 'success',
      })
    } catch (err: unknown) {
      const staleStage = getStaleStageConflict(err)
      if (staleStage) {
        toast({
          title: 'Lead was moved by someone else',
          description: `${card.reference} is now in ${staleStage.name}. The board has been refreshed.`,
          variant: 'warning',
        })
      } else {
        toast({
          title: 'Move failed',
          description: getErrorDetail(err, 'Could not move this lead right now.'),
          variant: 'error',
        })
      }
    } finally {
      setSubmitting(false)
      setPendingMove(null)
      // Refetch either confirms the optimistic state or rolls it back.
      await queryClient.invalidateQueries({ queryKey: BOARD_QUERY_KEY })
    }
  }

  const beginMove = (card: BoardLeadCard, fromStage: BoardStage, toStage: BoardStage) => {
    if (!toStage || fromStage.slug === toStage.slug) return
    const move = { card, fromStage, toStage }
    if (toStage.requires_reason) {
      setPendingMove(move)
      return
    }
    void performMove(move)
  }

  const handleDrop = (event: React.DragEvent, toStage: BoardStage) => {
    event.preventDefault()
    let payload: { leadId?: string; from?: string } = {}
    try {
      payload = JSON.parse(event.dataTransfer.getData('application/json') || '{}')
    } catch {
      return
    }
    if (!payload.leadId || !payload.from) return
    const fromStage = stages.find((stage) => stage.slug === payload.from)
    const card = fromStage?.leads.find((lead) => lead.id === payload.leadId)
    if (!fromStage || !card) return
    beginMove(card, fromStage, toStage)
  }

  if (isLoading) {
    return <div className="theme-panel rounded-[1.8rem] p-6 text-sm text-muted-foreground">Loading board...</div>
  }

  if (error) {
    return <ErrorPanel error={error} subject="the lead board" />
  }

  if (stages.length === 0) {
    return (
      <div className="theme-panel rounded-[1.8rem] p-6 text-sm text-muted-foreground">
        No pipeline stages yet. Create stages in Pipeline settings to start tracking leads.
      </div>
    )
  }

  return (
    <>
      <div className="overflow-x-auto pb-2" data-testid="leads-board">
        <div className="flex items-start gap-4">
          {stages.map((stage) => (
            <div
              key={stage.id}
              data-testid={`board-column-${stage.slug}`}
              className="theme-panel w-72 shrink-0 rounded-[1.5rem] border-0 p-3"
              onDragOver={(event) => {
                event.preventDefault()
                event.dataTransfer.dropEffect = 'move'
              }}
              onDrop={(event) => handleDrop(event, stage)}
            >
              <div
                className="rounded-xl border-t-4 bg-white/60 px-3 py-2"
                style={{ borderTopColor: stage.color || 'transparent' }}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-foreground">{stage.name}</p>
                  <span className="rounded-full bg-[rgb(var(--theme-neutral-rgb))] px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                    {stage.lead_count}
                  </span>
                </div>
              </div>

              <div className="mt-3 space-y-2">
                {stage.leads.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-[rgb(var(--theme-border-rgb)/0.8)] px-3 py-4 text-center text-xs text-muted-foreground">
                    No leads in this stage
                  </p>
                ) : (
                  stage.leads.map((card) => (
                    <div
                      key={card.id}
                      data-testid={`lead-card-${card.reference}`}
                      draggable
                      onDragStart={(event) => {
                        event.dataTransfer.setData(
                          'application/json',
                          JSON.stringify({ leadId: card.id, from: stage.slug })
                        )
                        event.dataTransfer.effectAllowed = 'move'
                      }}
                      onClick={() => router.push(`/admin/leads/${card.id}`)}
                      className={cn(
                        'cursor-pointer rounded-xl border border-[rgb(var(--theme-border-rgb)/0.8)] bg-white/85 p-3 transition hover:border-primary/40 hover:shadow-sm'
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[11px] font-semibold text-muted-foreground">
                          {card.reference}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {formatRelativeTime(card.created_at)}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-sm font-medium text-foreground">
                        {card.name || 'Unknown'}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{card.phone}</p>
                      {card.service_name ? (
                        <p className="mt-1 truncate text-xs text-muted-foreground">{card.service_name}</p>
                      ) : null}
                      <select
                        data-testid="lead-move-select"
                        aria-label={`Move ${card.reference} to another stage`}
                        value=""
                        disabled={submitting}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) => {
                          event.stopPropagation()
                          const targetSlug = event.target.value
                          if (!targetSlug) return
                          const toStage = stages.find((s) => s.slug === targetSlug)
                          if (toStage) beginMove(card, stage, toStage)
                        }}
                        className="mt-2 w-full rounded-lg border border-[rgb(var(--theme-border-rgb)/0.8)] bg-transparent px-2 py-1 text-xs text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
                      >
                        <option value="">Move to…</option>
                        {stages
                          .filter((target) => target.slug !== stage.slug)
                          .map((target) => (
                            <option key={target.slug} value={target.slug}>
                              {target.name}
                            </option>
                          ))}
                      </select>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <StageReasonDialog
        open={!!pendingMove}
        stageName={pendingMove?.toStage.name || ''}
        submitting={submitting}
        onConfirm={(reason) => {
          if (pendingMove) void performMove(pendingMove, reason)
        }}
        onCancel={() => setPendingMove(null)}
      />
    </>
  )
}

// ---------------------------------------------------------------- Page shell

export default function AdminLeads() {
  const router = useRouter()
  const pathname = usePathname() ?? ''
  const searchParams = useSearchParams()
  const searchParamString = searchParams?.toString() ?? ''
  const view = searchParams?.get('view') === 'board' ? 'board' : 'table'

  const setView = (next: 'table' | 'board') => {
    updateSearchParams(searchParamString, { view: next === 'table' ? '' : next }, router, pathname)
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Incoming leads from the public site, ordered newest first.
        </p>
        <div className="flex gap-2">
          <Button
            data-testid="leads-view-table"
            variant={view === 'table' ? 'default' : 'outline'}
            className="rounded-xl"
            onClick={() => setView('table')}
          >
            <Table2 className="mr-2 h-4 w-4" />
            Table
          </Button>
          <Button
            data-testid="leads-view-board"
            variant={view === 'board' ? 'default' : 'outline'}
            className="rounded-xl"
            onClick={() => setView('board')}
          >
            <Columns3 className="mr-2 h-4 w-4" />
            Board
          </Button>
        </div>
      </div>

      {view === 'board' ? <LeadsBoard /> : <LeadsTable />}
    </div>
  )
}

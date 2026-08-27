'use client'
import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react'

import { useToast } from '@/hooks/useToast'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  createPipelineStage,
  deletePipelineStage,
  getErrorDetail,
  getErrorStatus,
  getPipelineStages,
  PipelineStage,
  reorderPipelineStages,
  updatePipelineStage,
} from '@/services/adminLeads'
import { cn } from '@/lib/utils'

const STAGES_QUERY_KEY = ['admin-pipeline-stages']

const FLAG_FIELDS: Array<{ key: keyof StageDraft; label: string; hint: string }> = [
  { key: 'requires_reason', label: 'Requires reason', hint: 'Moving a lead here asks for a reason.' },
  { key: 'is_terminal', label: 'Terminal', hint: 'Leads in this stage are considered closed.' },
  { key: 'counts_as_converted', label: 'Converted', hint: 'Counts toward the conversion rate.' },
  { key: 'is_active', label: 'Active', hint: 'Inactive stages are hidden from the board.' },
]

interface StageDraft {
  name: string
  color: string
  requires_reason: boolean
  is_terminal: boolean
  counts_as_converted: boolean
  is_active: boolean
}

function draftFromStage(stage: PipelineStage): StageDraft {
  return {
    name: stage.name,
    color: stage.color || '#64748b',
    requires_reason: !!stage.requires_reason,
    is_terminal: !!stage.is_terminal,
    counts_as_converted: !!stage.counts_as_converted,
    is_active: stage.is_active !== false,
  }
}

function StageRow({
  stage,
  index,
  total,
  reordering,
  onMove,
  onDeleteRequest,
}: {
  stage: PipelineStage
  index: number
  total: number
  reordering: boolean
  onMove: (stageId: PipelineStage['id'], direction: -1 | 1) => void
  onDeleteRequest: (stage: PipelineStage) => void
}) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [draft, setDraft] = useState<StageDraft>(() => draftFromStage(stage))
  const [saving, setSaving] = useState(false)

  const baseline = draftFromStage(stage)
  const dirty = JSON.stringify(draft) !== JSON.stringify(baseline)
  const archived = stage.is_active === false

  const save = async () => {
    setSaving(true)
    try {
      await updatePipelineStage(stage.id, draft)
      await queryClient.invalidateQueries({ queryKey: STAGES_QUERY_KEY })
      toast({ title: 'Stage saved', description: `"${draft.name}" was updated.`, variant: 'success' })
    } catch (err: unknown) {
      toast({
        title: 'Save failed',
        description: getErrorDetail(err, 'Could not save this stage right now.'),
        variant: 'error',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className={cn(
        'rounded-[1.3rem] border border-[rgb(var(--theme-border-rgb)/0.8)] bg-white/70 p-4',
        archived && 'opacity-60'
      )}
    >
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-col gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7 rounded-lg"
            aria-label={`Move ${stage.name} up`}
            disabled={reordering || index === 0}
            onClick={() => onMove(stage.id, -1)}
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7 rounded-lg"
            aria-label={`Move ${stage.name} down`}
            disabled={reordering || index === total - 1}
            onClick={() => onMove(stage.id, 1)}
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>

        <input
          type="color"
          aria-label={`Color for ${stage.name}`}
          value={/^#[0-9a-fA-F]{6}$/.test(draft.color) ? draft.color : '#64748b'}
          onChange={(event) => setDraft({ ...draft, color: event.target.value })}
          className="h-9 w-9 cursor-pointer rounded-lg border border-[rgb(var(--theme-border-rgb)/0.8)] bg-transparent p-0.5"
        />

        <div className="min-w-[12rem] flex-1">
          <Input
            value={draft.name}
            onChange={(event) => setDraft({ ...draft, name: event.target.value })}
            aria-label="Stage name"
          />
          <p className="mt-1 font-mono text-[11px] text-muted-foreground">{stage.slug}</p>
        </div>

        {archived ? <Badge variant="warning">Archived</Badge> : null}
        {stage.lead_count !== undefined ? (
          <span className="text-xs text-muted-foreground">{stage.lead_count} leads</span>
        ) : null}

        <div className="ml-auto flex items-center gap-2">
          {dirty ? (
            <Button className="rounded-xl" onClick={save} disabled={saving || !draft.name.trim()}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          ) : null}
          <Button
            variant="outline"
            size="icon"
            className="rounded-xl text-rose-600 hover:text-rose-700"
            aria-label={`Delete ${stage.name}`}
            onClick={() => onDeleteRequest(stage)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {FLAG_FIELDS.map((flag) => (
          <div key={flag.key} className="flex items-center justify-between gap-3 rounded-xl bg-white/60 px-3 py-2">
            <div>
              <p className="text-xs font-semibold text-foreground">{flag.label}</p>
              <p className="text-[11px] text-muted-foreground">{flag.hint}</p>
            </div>
            <Switch
              checked={draft[flag.key] as boolean}
              onCheckedChange={(checked) => setDraft({ ...draft, [flag.key]: checked })}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function AdminPipelineSettings() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [reordering, setReordering] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#0ea5e9')
  const [creating, setCreating] = useState(false)
  const [stageToDelete, setStageToDelete] = useState<PipelineStage | null>(null)
  const [deleting, setDeleting] = useState(false)

  const { data, isLoading, error } = useQuery({
    queryKey: STAGES_QUERY_KEY,
    queryFn: getPipelineStages,
  })

  const stages = useMemo(() => (data || []).slice().sort((a, b) => a.order - b.order), [data])

  const handleMove = async (stageId: PipelineStage['id'], direction: -1 | 1) => {
    const index = stages.findIndex((stage) => stage.id === stageId)
    const targetIndex = index + direction
    if (index < 0 || targetIndex < 0 || targetIndex >= stages.length) return

    const orderedIds = stages.map((stage) => stage.id)
    ;[orderedIds[index], orderedIds[targetIndex]] = [orderedIds[targetIndex], orderedIds[index]]

    setReordering(true)
    try {
      await reorderPipelineStages(orderedIds)
      await queryClient.invalidateQueries({ queryKey: STAGES_QUERY_KEY })
    } catch (err: unknown) {
      toast({
        title: 'Reorder failed',
        description: getErrorDetail(err, 'Could not reorder the stages right now.'),
        variant: 'error',
      })
    } finally {
      setReordering(false)
    }
  }

  const handleCreate = async () => {
    if (!newName.trim()) return
    setCreating(true)
    try {
      await createPipelineStage({ name: newName.trim(), color: newColor })
      setNewName('')
      await queryClient.invalidateQueries({ queryKey: STAGES_QUERY_KEY })
      toast({ title: 'Stage created', variant: 'success' })
    } catch (err: unknown) {
      toast({
        title: 'Create failed',
        description: getErrorDetail(err, 'Could not create the stage right now.'),
        variant: 'error',
      })
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async () => {
    if (!stageToDelete) return
    setDeleting(true)
    try {
      const result = await deletePipelineStage(stageToDelete.id)
      setStageToDelete(null)
      await queryClient.invalidateQueries({ queryKey: STAGES_QUERY_KEY })
      toast({
        title: result.archived ? 'Stage archived' : 'Stage deleted',
        description: result.archived
          ? 'This stage is referenced by leads, so it was archived instead of deleted.'
          : 'The stage was permanently deleted.',
        variant: 'success',
      })
    } catch (err: unknown) {
      toast({
        title: 'Delete failed',
        description: getErrorDetail(err, 'Could not delete this stage right now.'),
        variant: 'error',
      })
    } finally {
      setDeleting(false)
    }
  }

  if (isLoading) {
    return <div className="theme-panel rounded-[1.8rem] p-6 text-sm text-muted-foreground">Loading pipeline stages...</div>
  }

  if (error) {
    const status = getErrorStatus(error)
    return (
      <div className="theme-panel rounded-[1.8rem] p-6 text-sm text-rose-600">
        {status === 403
          ? 'You do not have permission to manage the pipeline.'
          : 'Could not load pipeline stages right now.'}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="theme-panel rounded-[1.8rem] border-0">
        <CardHeader>
          <CardTitle>Pipeline stages</CardTitle>
          <CardDescription>
            Order, colors, and behavior of the lead pipeline. Stages in use are archived, not deleted.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {stages.length === 0 ? (
            <p className="text-sm text-muted-foreground">No stages yet. Add the first one below.</p>
          ) : (
            stages.map((stage, index) => (
              <StageRow
                key={String(stage.id)}
                stage={stage}
                index={index}
                total={stages.length}
                reordering={reordering}
                onMove={handleMove}
                onDeleteRequest={setStageToDelete}
              />
            ))
          )}
        </CardContent>
      </Card>

      <Card className="theme-panel rounded-[1.8rem] border-0">
        <CardHeader>
          <CardTitle>Add stage</CardTitle>
          <CardDescription>New stages are appended to the end of the pipeline.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="color"
              aria-label="New stage color"
              value={newColor}
              onChange={(event) => setNewColor(event.target.value)}
              className="h-9 w-9 cursor-pointer rounded-lg border border-[rgb(var(--theme-border-rgb)/0.8)] bg-transparent p-0.5"
            />
            <Input
              placeholder="Stage name"
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              className="max-w-xs"
            />
            <Button className="rounded-xl" onClick={handleCreate} disabled={creating || !newName.trim()}>
              <Plus className="mr-2 h-4 w-4" />
              {creating ? 'Adding...' : 'Add stage'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!stageToDelete} onOpenChange={(open) => !deleting && !open && setStageToDelete(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Delete stage</DialogTitle>
            <DialogDescription>
              Delete &quot;{stageToDelete?.name}&quot;? If any leads reference this stage it will be
              archived instead of permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => setStageToDelete(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button variant="destructive" className="rounded-xl" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete stage'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

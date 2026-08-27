'use client'
import { useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  GitBranch,
  MessageCircle,
  Phone,
  StickyNote,
} from 'lucide-react'

import { useToast } from '@/hooks/useToast'
import { Button } from '@/components/ui/button'
import { CustomSelect } from '@/components/ui/custom-select'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { getAdminUsers } from '@/services/admin'
import {
  actorLabel,
  addLeadActivity,
  getContentServices,
  getErrorDetail,
  getErrorStatus,
  getLeadDetail,
  getPipelineStages,
  getStaleStageConflict,
  LeadDetail,
  moveLeadStage,
  PipelineStage,
  updateLead,
} from '@/services/adminLeads'

import { formatDateTime, formatRelativeTime } from './admin-helpers'
import { StageChip, StageReasonDialog } from './lead-shared'

interface AdminUserRow {
  id: string
  username: string
  is_staff?: boolean
}

const ATTRIBUTION_ROWS: Array<{ key: string; label: string }> = [
  { key: 'utm_source', label: 'UTM source' },
  { key: 'utm_medium', label: 'UTM medium' },
  { key: 'utm_campaign', label: 'UTM campaign' },
  { key: 'utm_term', label: 'UTM term' },
  { key: 'utm_content', label: 'UTM content' },
  { key: 'fbclid', label: 'Facebook click id' },
  { key: 'gclid', label: 'Google click id' },
  { key: 'landing_page', label: 'Landing page' },
  { key: 'referrer', label: 'Referrer' },
]

const TIMELINE_ICONS: Record<string, React.ElementType> = {
  note: StickyNote,
  call: Phone,
  whatsapp_click: MessageCircle,
}

interface TimelineEntry {
  key: string
  icon: React.ElementType
  title: string
  body?: string
  actor: string
  created_at: string
}

interface ProfileDraft {
  name: string
  phone: string
  email: string
  source: string
  lang: string
  consent_marketing: boolean
}

export default function AdminLeadDetail() {
  const params = useParams()
  const leadId = params?.leadId as string | undefined
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const [editingProfile, setEditingProfile] = useState(false)
  const [profileDraft, setProfileDraft] = useState<ProfileDraft | null>(null)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingField, setSavingField] = useState(false)
  const [pendingStage, setPendingStage] = useState<PipelineStage | null>(null)
  const [movingStage, setMovingStage] = useState(false)
  const [noteBody, setNoteBody] = useState('')
  const [addingNote, setAddingNote] = useState(false)

  const detailQueryKey = useMemo(() => ['admin-lead-detail', leadId], [leadId])

  const { data, isLoading, error } = useQuery({
    queryKey: detailQueryKey,
    queryFn: () => getLeadDetail(leadId as string),
    enabled: !!leadId,
  })

  const { data: stages } = useQuery({
    queryKey: ['admin-pipeline-stages'],
    queryFn: getPipelineStages,
  })

  const { data: services } = useQuery({
    queryKey: ['content-services'],
    queryFn: getContentServices,
  })

  const { data: usersData } = useQuery({
    queryKey: ['admin-users', { page: '1', page_size: '100', ordering: 'username' }],
    queryFn: () => getAdminUsers({ page: '1', page_size: '100', ordering: 'username' }),
  })

  const staffOptions = useMemo(() => {
    const results = (usersData?.results || []) as AdminUserRow[]
    const hasStaffFlag = results.some((user) => user.is_staff !== undefined)
    const staff = hasStaffFlag ? results.filter((user) => user.is_staff) : results
    return staff.map((user) => ({ label: user.username, value: user.id }))
  }, [usersData])

  const activeStages = useMemo(
    () =>
      (stages || [])
        .filter((stage) => stage.is_active !== false)
        .slice()
        .sort((a, b) => a.order - b.order),
    [stages]
  )

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: detailQueryKey })
    await queryClient.invalidateQueries({ queryKey: ['admin-leads'] })
    await queryClient.invalidateQueries({ queryKey: ['admin-leads-board'] })
  }

  const patchLead = async (payload: Parameters<typeof updateLead>[1], successTitle: string) => {
    if (!leadId) return
    setSavingField(true)
    try {
      await updateLead(leadId, payload)
      await refresh()
      toast({ title: successTitle, variant: 'success' })
    } catch (err: unknown) {
      toast({
        title: 'Update failed',
        description: getErrorDetail(err, 'Could not update this lead right now.'),
        variant: 'error',
      })
    } finally {
      setSavingField(false)
    }
  }

  const performStageMove = async (toStage: PipelineStage, reason?: string) => {
    if (!leadId || !data?.lead) return
    setMovingStage(true)
    try {
      await moveLeadStage(leadId, {
        stage: toStage.slug,
        expected_stage: data.lead.stage.slug,
        reason: reason || undefined,
      })
      toast({
        title: 'Lead moved',
        description: `${data.lead.reference} is now in ${toStage.name}.`,
        variant: 'success',
      })
    } catch (err: unknown) {
      const staleStage = getStaleStageConflict(err)
      if (staleStage) {
        toast({
          title: 'Lead was moved by someone else',
          description: `This lead is now in ${staleStage.name}. The page has been refreshed.`,
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
      setMovingStage(false)
      setPendingStage(null)
      await refresh()
    }
  }

  const handleStageSelect = (slug: string) => {
    if (!slug || !data?.lead || slug === data.lead.stage.slug) return
    const toStage = activeStages.find((stage) => stage.slug === slug)
    if (!toStage) return
    if (toStage.requires_reason) {
      setPendingStage(toStage)
      return
    }
    void performStageMove(toStage)
  }

  const handleWhatsAppClick = () => {
    if (!leadId) return
    // Log the click without blocking the wa.me navigation.
    addLeadActivity(leadId, { type: 'whatsapp_click' })
      .then(() => queryClient.invalidateQueries({ queryKey: detailQueryKey }))
      .catch(() => {})
  }

  const startEditingProfile = (lead: LeadDetail) => {
    setProfileDraft({
      name: lead.name || '',
      phone: lead.phone || '',
      email: lead.email || '',
      source: lead.source || '',
      lang: lead.lang || 'en',
      consent_marketing: !!lead.consent_marketing,
    })
    setEditingProfile(true)
  }

  const saveProfile = async () => {
    if (!leadId || !profileDraft) return
    setSavingProfile(true)
    try {
      await updateLead(leadId, {
        name: profileDraft.name,
        phone: profileDraft.phone,
        email: profileDraft.email,
        source: profileDraft.source,
        lang: profileDraft.lang,
        consent_marketing: profileDraft.consent_marketing,
      })
      setEditingProfile(false)
      await refresh()
      toast({ title: 'Lead updated', variant: 'success' })
    } catch (err: unknown) {
      toast({
        title: 'Update failed',
        description: getErrorDetail(err, 'Could not save the lead profile right now.'),
        variant: 'error',
      })
    } finally {
      setSavingProfile(false)
    }
  }

  const handleAddNote = async () => {
    if (!leadId || !noteBody.trim()) return
    setAddingNote(true)
    try {
      await addLeadActivity(leadId, { type: 'note', body: noteBody.trim() })
      setNoteBody('')
      await queryClient.invalidateQueries({ queryKey: detailQueryKey })
      toast({ title: 'Note added', variant: 'success' })
    } catch (err: unknown) {
      toast({
        title: 'Note failed',
        description: getErrorDetail(err, 'Could not add the note right now.'),
        variant: 'error',
      })
    } finally {
      setAddingNote(false)
    }
  }

  if (isLoading) {
    return <div className="theme-panel rounded-[1.8rem] p-6 text-sm text-muted-foreground">Loading lead...</div>
  }

  if (error || !data?.lead) {
    const status = getErrorStatus(error)
    return (
      <div className="theme-panel rounded-[1.8rem] p-6 text-sm text-rose-600">
        {status === 403
          ? 'You do not have permission to view this lead.'
          : 'Could not load this lead right now.'}
      </div>
    )
  }

  const { lead } = data

  const timeline: TimelineEntry[] = [
    ...data.transitions.map((transition) => ({
      key: `transition-${transition.id}`,
      icon: GitBranch,
      title: transition.from_stage
        ? `Moved from ${transition.from_stage.name} to ${transition.to_stage.name}`
        : `Entered ${transition.to_stage.name}`,
      body: transition.reason || undefined,
      actor: actorLabel(transition.changed_by),
      created_at: transition.created_at,
    })),
    ...data.activities.map((activity) => ({
      key: `activity-${activity.id}`,
      icon: TIMELINE_ICONS[activity.type] || StickyNote,
      title:
        activity.type === 'whatsapp_click'
          ? 'WhatsApp conversation opened'
          : activity.type === 'call'
            ? 'Call logged'
            : 'Note',
      body: activity.body || undefined,
      actor: actorLabel(activity.actor),
      created_at: activity.created_at,
    })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const attributionEntries = ATTRIBUTION_ROWS.map(({ key, label }) => ({
    key,
    label,
    value: lead.attribution?.[key] || '',
  })).filter((row) => !!row.value)

  const customFieldEntries = Object.entries(lead.custom_fields || {})

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="theme-panel rounded-[1.8rem] border-0">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono text-xl font-semibold text-foreground">{lead.reference}</span>
            <StageChip name={lead.stage.name} color={lead.stage.color} data-testid="detail-stage-chip" />
            <span className="text-sm text-muted-foreground">
              Created {formatDateTime(lead.created_at)} ({formatRelativeTime(lead.created_at)})
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select
              data-testid="detail-stage-select"
              aria-label="Move lead to another stage"
              value=""
              disabled={movingStage || activeStages.length === 0}
              onChange={(event) => handleStageSelect(event.target.value)}
              className="h-10 rounded-xl border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="">{movingStage ? 'Moving...' : 'Move to…'}</option>
              {activeStages
                .filter((stage) => stage.slug !== lead.stage.slug)
                .map((stage) => (
                  <option key={stage.slug} value={stage.slug}>
                    {stage.name}
                  </option>
                ))}
            </select>
            {lead.whatsapp_url ? (
              <Button asChild className="rounded-xl bg-emerald-600 text-white hover:bg-emerald-700">
                <a
                  data-testid="whatsapp-button"
                  href={lead.whatsapp_url}
                  target="_blank"
                  rel="noreferrer"
                  onClick={handleWhatsAppClick}
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  WhatsApp
                </a>
              </Button>
            ) : (
              <Button
                data-testid="whatsapp-button"
                className="rounded-xl"
                disabled
                title="No valid phone number for WhatsApp"
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                WhatsApp unavailable
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          {/* Profile */}
          <Card className="theme-panel rounded-[1.8rem] border-0">
            <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
              <div>
                <CardTitle>Lead profile</CardTitle>
                <CardDescription>Contact details and ownership.</CardDescription>
              </div>
              {!editingProfile ? (
                <Button variant="outline" className="rounded-xl" onClick={() => startEditingProfile(lead)}>
                  Edit
                </Button>
              ) : null}
            </CardHeader>
            <CardContent className="space-y-5">
              {editingProfile && profileDraft ? (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        Name
                      </label>
                      <Input
                        value={profileDraft.name}
                        onChange={(event) => setProfileDraft({ ...profileDraft, name: event.target.value })}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        Phone
                      </label>
                      <Input
                        value={profileDraft.phone}
                        onChange={(event) => setProfileDraft({ ...profileDraft, phone: event.target.value })}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        Email
                      </label>
                      <Input
                        value={profileDraft.email}
                        onChange={(event) => setProfileDraft({ ...profileDraft, email: event.target.value })}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        Source
                      </label>
                      <Input
                        value={profileDraft.source}
                        onChange={(event) => setProfileDraft({ ...profileDraft, source: event.target.value })}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        Language
                      </label>
                      <CustomSelect
                        value={profileDraft.lang}
                        onChange={(value) => setProfileDraft({ ...profileDraft, lang: String(value) })}
                        options={[
                          { label: 'English', value: 'en' },
                          { label: 'Bangla', value: 'bn' },
                        ]}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        Marketing consent
                      </label>
                      <div className="flex h-10 items-center">
                        <Switch
                          checked={profileDraft.consent_marketing}
                          onCheckedChange={(checked) =>
                            setProfileDraft({ ...profileDraft, consent_marketing: checked })
                          }
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button className="rounded-xl" onClick={saveProfile} disabled={savingProfile}>
                      {savingProfile ? 'Saving...' : 'Save changes'}
                    </Button>
                    <Button
                      variant="outline"
                      className="rounded-xl"
                      onClick={() => setEditingProfile(false)}
                      disabled={savingProfile}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Name</p>
                    <p className="mt-1 font-medium text-foreground">{lead.name || 'Unknown'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Phone</p>
                    <p className="mt-1 text-foreground">{lead.phone || 'Not provided'}</p>
                    {lead.phone_normalized && lead.phone_normalized !== lead.phone ? (
                      <p className="text-xs text-muted-foreground">Normalized: {lead.phone_normalized}</p>
                    ) : null}
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Email</p>
                    <p className="mt-1 text-foreground">{lead.email || 'Not provided'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Source</p>
                    <p className="mt-1 text-foreground">{lead.source || 'Not recorded'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Language</p>
                    <p className="mt-1 text-foreground">{lead.lang === 'bn' ? 'Bangla' : 'English'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Marketing consent
                    </p>
                    <p className="mt-1 text-foreground">{lead.consent_marketing ? 'Given' : 'Not given'}</p>
                  </div>
                </div>
              )}

              <div className="grid gap-4 border-t border-[rgb(var(--theme-border-rgb)/0.7)] pt-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Service
                  </label>
                  <CustomSelect
                    value={lead.service?.slug || ''}
                    disabled={savingField}
                    onChange={(value) =>
                      patchLead({ service: value ? String(value) : null }, 'Service updated')
                    }
                    options={[
                      { label: 'No service', value: '' },
                      ...(services || []).map((service) => ({
                        label: service.name,
                        value: service.slug,
                      })),
                    ]}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Assignee
                  </label>
                  <CustomSelect
                    value={lead.assigned_to?.id || ''}
                    disabled={savingField}
                    onChange={(value) =>
                      patchLead({ assigned_to: value ? String(value) : null }, 'Assignee updated')
                    }
                    options={[{ label: 'Unassigned', value: '' }, ...staffOptions]}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Message + custom fields */}
          <Card className="theme-panel rounded-[1.8rem] border-0">
            <CardHeader>
              <CardTitle>Message</CardTitle>
              <CardDescription>What the lead submitted.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {lead.message ? (
                <p className="whitespace-pre-wrap rounded-xl bg-white/60 p-4 text-sm text-foreground">
                  {lead.message}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">No message was submitted.</p>
              )}

              {customFieldEntries.length > 0 ? (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Custom fields
                  </p>
                  <table className="min-w-full text-left text-sm">
                    <tbody>
                      {customFieldEntries.map(([key, value]) => (
                        <tr key={key} className="border-t border-[rgb(var(--theme-border-rgb)/0.7)]">
                          <td className="py-2 pr-4 font-medium text-foreground">{key}</td>
                          <td className="py-2 text-muted-foreground">
                            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {/* Attribution */}
          <Card className="theme-panel rounded-[1.8rem] border-0" data-testid="attribution-panel">
            <CardHeader>
              <CardTitle>Attribution</CardTitle>
              <CardDescription>Where this lead came from.</CardDescription>
            </CardHeader>
            <CardContent>
              {attributionEntries.length === 0 ? (
                <p className="text-sm text-muted-foreground">Direct / unknown</p>
              ) : (
                <table className="min-w-full text-left text-sm">
                  <tbody>
                    {attributionEntries.map((row) => (
                      <tr key={row.key} className="border-t border-[rgb(var(--theme-border-rgb)/0.7)] first:border-t-0">
                        <td className="py-2 pr-4 font-medium text-foreground">{row.label}</td>
                        <td className="break-all py-2 text-muted-foreground">{row.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Timeline */}
        <Card className="theme-panel rounded-[1.8rem] border-0">
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
            <CardDescription>Stage changes, notes, and contact activity.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-3" data-testid="note-composer">
              <Textarea
                value={noteBody}
                onChange={(event) => setNoteBody(event.target.value)}
                placeholder="Add an internal note about this lead..."
                disabled={addingNote}
              />
              <Button
                className="rounded-xl"
                onClick={handleAddNote}
                disabled={addingNote || !noteBody.trim()}
              >
                {addingNote ? 'Adding...' : 'Add note'}
              </Button>
            </div>

            {timeline.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity yet.</p>
            ) : (
              <ol className="space-y-4">
                {timeline.map((entry) => {
                  const Icon = entry.icon
                  return (
                    <li key={entry.key} className="flex gap-3">
                      <div className="theme-icon-primary mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">{entry.title}</p>
                        {entry.body ? (
                          <p className="mt-0.5 whitespace-pre-wrap text-sm text-muted-foreground">{entry.body}</p>
                        ) : null}
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {entry.actor} · {formatDateTime(entry.created_at)}
                        </p>
                      </div>
                    </li>
                  )
                })}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>

      <StageReasonDialog
        open={!!pendingStage}
        stageName={pendingStage?.name || ''}
        submitting={movingStage}
        onConfirm={(reason) => {
          if (pendingStage) void performStageMove(pendingStage, reason)
        }}
        onCancel={() => setPendingStage(null)}
      />
    </div>
  )
}

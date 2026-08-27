import api from './api'

/**
 * Typed client for the staff lead-management API (BP-4 contract).
 * All endpoints require a staff JWT (handled by the shared axios client).
 */

// ---------- Shared refs ----------

export interface LeadStageRef {
  id: number | string
  slug: string
  name: string
  color: string
}

export interface LeadServiceRef {
  id: number | string
  slug: string
  name_en: string
}

export interface LeadAssigneeRef {
  id: string
  username: string
  name: string
}

/** Actors come back either as a display string or a small user object. */
export type LeadActorRef =
  | string
  | { id?: string; username?: string; name?: string }
  | null

export function actorLabel(actor: LeadActorRef | undefined): string {
  if (!actor) return 'System'
  if (typeof actor === 'string') return actor
  return actor.name || actor.username || 'Staff'
}

// ---------- Lead list ----------

export interface LeadListItem {
  id: string
  reference: string
  name: string
  phone: string
  email: string
  service: LeadServiceRef | null
  stage: LeadStageRef
  assigned_to: LeadAssigneeRef | null
  source: string
  created_at: string
}

export interface LeadListResponse {
  count: number
  next: string | null
  previous: string | null
  results: LeadListItem[]
}

export interface LeadListParams {
  page?: string | number
  page_size?: string | number
  stage?: string
  service?: string
  assigned_to?: string
  search?: string
  date_from?: string
  date_to?: string
  ordering?: string
}

function buildParams(params: Record<string, string | number | undefined | null>) {
  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return
    }
    searchParams.set(key, String(value))
  })
  return searchParams
}

export async function getAdminLeads(params: LeadListParams = {}): Promise<LeadListResponse> {
  const response = await api.get(
    `/admin/leads/?${buildParams(params as Record<string, string | number | undefined>).toString()}`
  )
  return response.data
}

// ---------- Board ----------

export interface BoardLeadCard {
  id: string
  reference: string
  name: string
  phone: string
  service_name: string | null
  created_at: string
}

export interface BoardStage {
  id: number | string
  slug: string
  name: string
  color: string
  order: number
  is_terminal: boolean
  requires_reason: boolean
  lead_count: number
  leads: BoardLeadCard[]
}

export interface LeadBoardResponse {
  stages: BoardStage[]
}

export async function getLeadBoard(): Promise<LeadBoardResponse> {
  const response = await api.get('/admin/leads/board/')
  return response.data
}

// ---------- Summary ----------

export interface LeadStageCount {
  slug: string
  name: string
  color: string
  count: number
}

export interface LeadSummaryResponse {
  total: number
  new_today: number
  new_this_week: number
  new_this_month: number
  by_stage: LeadStageCount[]
  conversion_rate: number
}

export async function getLeadSummary(): Promise<LeadSummaryResponse> {
  const response = await api.get('/admin/leads/summary/')
  return response.data
}

// ---------- Detail ----------

export interface LeadDetailStage extends LeadStageRef {
  requires_reason: boolean
  is_terminal: boolean
}

export interface LeadDetail {
  id: string
  reference: string
  name: string
  phone: string
  phone_normalized: string
  email: string
  message: string
  source: string
  lang: string
  consent_marketing: boolean
  custom_fields: Record<string, unknown>
  attribution: Record<string, string | null | undefined>
  whatsapp_url: string | null
  service: LeadServiceRef | null
  stage: LeadDetailStage
  assigned_to: LeadAssigneeRef | null
  created_at: string
  updated_at: string
}

export interface LeadActivity {
  id: number | string
  type: string
  body: string
  actor: LeadActorRef
  created_at: string
}

export interface LeadTransition {
  id: number | string
  from_stage: { slug: string; name: string } | null
  to_stage: { slug: string; name: string; color: string }
  reason: string
  changed_by: LeadActorRef
  created_at: string
}

export interface LeadDetailResponse {
  lead: LeadDetail
  activities: LeadActivity[]
  transitions: LeadTransition[]
}

export async function getLeadDetail(leadId: string): Promise<LeadDetailResponse> {
  const response = await api.get(`/admin/leads/${leadId}/`)
  return response.data
}

export interface LeadUpdatePayload {
  name?: string
  phone?: string
  email?: string
  message?: string
  source?: string
  consent_marketing?: boolean
  lang?: string
  custom_fields?: Record<string, unknown>
  service?: string | null
  assigned_to?: string | null
}

export async function updateLead(
  leadId: string,
  payload: LeadUpdatePayload
): Promise<{ lead: LeadDetail }> {
  const response = await api.patch(`/admin/leads/${leadId}/`, payload)
  return response.data
}

// ---------- Stage moves ----------

export interface MoveStagePayload {
  stage: string
  reason?: string
  expected_stage?: string
}

export interface MoveStageResponse {
  lead: LeadDetail
  transition: LeadTransition
}

export async function moveLeadStage(
  leadId: string,
  payload: MoveStagePayload
): Promise<MoveStageResponse> {
  const response = await api.post(`/admin/leads/${leadId}/stage/`, payload)
  return response.data
}

interface AxiosLikeError {
  response?: {
    status?: number
    data?: {
      detail?: string
      current_stage?: LeadStageRef
      reason?: string[] | string
    }
  }
}

/** Returns the server's current stage when a stage move failed with 409 "stale", else null. */
export function getStaleStageConflict(error: unknown): LeadStageRef | null {
  const e = error as AxiosLikeError
  if (e?.response?.status === 409) {
    return e.response.data?.current_stage ?? { id: '', slug: '', name: 'another stage', color: '' }
  }
  return null
}

/** True when the server rejected the move because a reason is required/missing. */
export function isReasonRequiredError(error: unknown): boolean {
  const e = error as AxiosLikeError
  return e?.response?.status === 400 && !!e.response.data?.reason
}

export function getErrorDetail(error: unknown, fallback: string): string {
  const e = error as AxiosLikeError
  const data = e?.response?.data
  if (data?.detail) return data.detail
  if (data?.reason) {
    return Array.isArray(data.reason) ? data.reason.join(' ') : String(data.reason)
  }
  return fallback
}

export function getErrorStatus(error: unknown): number | undefined {
  return (error as AxiosLikeError)?.response?.status
}

// ---------- Activities ----------

export type LeadActivityType = 'note' | 'call' | 'whatsapp_click'

export async function addLeadActivity(
  leadId: string,
  payload: { type: LeadActivityType; body?: string }
): Promise<LeadActivity> {
  const response = await api.post(`/admin/leads/${leadId}/activities/`, payload)
  return response.data
}

// ---------- Pipeline stages ----------

export interface PipelineStage {
  id: number | string
  slug: string
  name: string
  color: string
  order: number
  is_active: boolean
  is_terminal: boolean
  counts_as_converted: boolean
  requires_reason: boolean
  lead_count?: number
}

export interface PipelineStagePayload {
  name?: string
  color?: string
  order?: number
  is_active?: boolean
  is_terminal?: boolean
  counts_as_converted?: boolean
  requires_reason?: boolean
}

export async function getPipelineStages(): Promise<PipelineStage[]> {
  const response = await api.get('/admin/pipeline/stages/')
  const data = response.data
  if (Array.isArray(data)) return data
  return data?.results ?? data?.stages ?? []
}

export async function createPipelineStage(payload: PipelineStagePayload): Promise<PipelineStage> {
  const response = await api.post('/admin/pipeline/stages/', payload)
  return response.data
}

export async function updatePipelineStage(
  stageId: number | string,
  payload: PipelineStagePayload
): Promise<PipelineStage> {
  const response = await api.patch(`/admin/pipeline/stages/${stageId}/`, payload)
  return response.data
}

/** DELETE returns 200 {detail:"archived"} when the stage is referenced, else 204. */
export async function deletePipelineStage(
  stageId: number | string
): Promise<{ archived: boolean; detail?: string }> {
  const response = await api.delete(`/admin/pipeline/stages/${stageId}/`)
  if (response.status === 200) {
    return { archived: true, detail: response.data?.detail }
  }
  return { archived: false }
}

export async function reorderPipelineStages(order: Array<number | string>): Promise<void> {
  await api.post('/admin/pipeline/stages/reorder/', { order })
}

// ---------- Public content (service dropdown) ----------

export interface ContentService {
  id: number | string
  slug: string
  name: string
}

export async function getContentServices(): Promise<ContentService[]> {
  const response = await api.get('/content/services/?lang=en')
  const data = response.data
  return Array.isArray(data) ? data : data?.results ?? []
}

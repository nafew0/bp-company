'use client'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

/** Small colored stage chip driven by the stage's stored color (any CSS color). */
export function StageChip({
  name,
  color,
  className,
  ...rest
}: {
  name: string
  color?: string
  className?: string
} & React.HTMLAttributes<HTMLSpanElement>) {
  const chipColor = color || 'var(--foreground, currentColor)'
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border bg-white/70 px-2.5 py-1 text-xs font-semibold',
        className
      )}
      style={{ borderColor: chipColor, color: chipColor }}
      {...rest}
    >
      <span
        aria-hidden
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: chipColor }}
      />
      {name}
    </span>
  )
}

/**
 * Reason dialog shown before moving a lead into a stage with requires_reason.
 * The reason is collected BEFORE the stage POST is sent.
 */
export function StageReasonDialog({
  open,
  stageName,
  submitting,
  onConfirm,
  onCancel,
}: {
  open: boolean
  stageName: string
  submitting: boolean
  onConfirm: (reason: string) => void
  onCancel: () => void
}) {
  const [reason, setReason] = useState('')
  const [prevOpen, setPrevOpen] = useState(open)

  // Reset the reason whenever the dialog (re)opens.
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setReason('')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !submitting && onCancel()}>
      <DialogContent className="max-w-lg" data-testid="stage-reason-dialog">
        <DialogHeader>
          <DialogTitle>Reason required</DialogTitle>
          <DialogDescription>
            Moving a lead to <span className="font-semibold text-foreground">{stageName}</span>{' '}
            requires a short reason. It is recorded on the lead timeline.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Why is this lead moving here?"
          disabled={submitting}
        />
        <DialogFooter>
          <Button variant="outline" className="rounded-xl" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
          <Button
            className="rounded-xl"
            onClick={() => onConfirm(reason.trim())}
            disabled={submitting || !reason.trim()}
          >
            {submitting ? 'Moving...' : 'Move lead'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

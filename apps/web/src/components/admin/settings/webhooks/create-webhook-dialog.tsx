'use client'

import { useState, useTransition } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { SecretRevealDialog } from '@/components/shared/secret-reveal-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { createWebhookFn } from '@/lib/server/functions/webhooks'
import {
  WEBHOOK_EVENTS,
  WEBHOOK_EVENT_CONFIG,
} from '@/lib/server/events/integrations/webhook/constants'
import * as m from '@/paraglide/messages'

interface CreateWebhookDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateWebhookDialog({ open, onOpenChange }: CreateWebhookDialogProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [isPending, startTransition] = useTransition()

  // Form state
  const [url, setUrl] = useState('')
  const [selectedEvents, setSelectedEvents] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  // Secret reveal state
  const [createdSecret, setCreatedSecret] = useState<string | null>(null)
  const translatedEventConfig = WEBHOOK_EVENT_CONFIG.map((event) => ({
    ...event,
    label: getWebhookEventLabel(event.id),
    description: getWebhookEventDescription(event.id),
  }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (selectedEvents.length === 0) {
      setError(m.webhooks_select_at_least_one_event())
      return
    }

    try {
      const result = await createWebhookFn({
        data: {
          url,
          events: selectedEvents as (typeof WEBHOOK_EVENTS)[number][],
        },
      })

      startTransition(() => {
        queryClient.invalidateQueries({ queryKey: ['admin', 'webhooks'] })
        router.invalidate()
      })

      // Show secret reveal
      setCreatedSecret(result.secret)
    } catch (err) {
      setError(err instanceof Error ? err.message : m.webhooks_create_failed())
    }
  }

  const handleClose = () => {
    setUrl('')
    setSelectedEvents([])
    setError(null)
    setCreatedSecret(null)
    onOpenChange(false)
  }

  const toggleEvent = (eventId: string) => {
    setSelectedEvents((prev) =>
      prev.includes(eventId) ? prev.filter((e) => e !== eventId) : [...prev, eventId]
    )
  }

  // Secret reveal view
  if (createdSecret) {
    return (
      <SecretRevealDialog
        open={open}
        onOpenChange={handleClose}
        title={m.webhooks_created_title()}
        description={m.webhooks_save_secret_now()}
        secretLabel={m.webhooks_signing_secret_label()}
        secretValue={createdSecret}
        confirmLabel={m.webhooks_secret_saved_confirm()}
      >
        <div className="text-xs text-muted-foreground space-y-1">
          <p>
            <strong>{m.webhooks_verification_label()}</strong>{' '}
            {m.webhooks_verification_includes_header_prefix()}{' '}
            <code className="bg-muted px-1 rounded">X-Quackback-Signature</code> header.
          </p>
          <p>
            {m.webhooks_compute_prefix()}{' '}
            <code className="bg-muted px-1 rounded">HMAC-SHA256(timestamp.payload, secret)</code>{' '}
            {m.webhooks_compute_suffix()}
          </p>
        </div>
      </SecretRevealDialog>
    )
  }

  // Create form view
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{m.webhooks_create_title()}</DialogTitle>
          <DialogDescription>{m.webhooks_create_description()}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="url">{m.webhooks_endpoint_url_label()}</Label>
              <Input
                id="url"
                type="url"
                placeholder={m.webhooks_endpoint_url_placeholder()}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={isPending}
                required
              />
              <p className="text-xs text-muted-foreground">{m.webhooks_https_required()}</p>
            </div>

            <div className="space-y-2">
              <Label>{m.webhooks_events_label()}</Label>
              <div className="space-y-2">
                {translatedEventConfig.map((event) => (
                  <label
                    key={event.id}
                    className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      checked={selectedEvents.includes(event.id)}
                      onCheckedChange={() => toggleEvent(event.id)}
                      disabled={isPending}
                      className="mt-0.5"
                      aria-label={m.webhooks_subscribe_event_aria({ event: event.label })}
                    />
                    <div>
                      <p className="text-sm font-medium">{event.label}</p>
                      <p className="text-xs text-muted-foreground">{event.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
              {m.common_cancel()}
            </Button>
            <Button type="submit" disabled={isPending || !url || selectedEvents.length === 0}>
              {isPending ? m.webhooks_creating() : m.webhooks_create_button()}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function getWebhookEventLabel(eventId: string) {
  switch (eventId) {
    case 'post.created':
      return m.webhooks_event_post_created_label()
    case 'post.status_changed':
      return m.webhooks_event_post_status_changed_label()
    case 'post.updated':
      return m.webhooks_event_post_updated_label()
    case 'post.deleted':
      return m.webhooks_event_post_deleted_label()
    case 'post.restored':
      return m.webhooks_event_post_restored_label()
    case 'post.merged':
      return m.webhooks_event_post_merged_label()
    case 'post.unmerged':
      return m.webhooks_event_post_unmerged_label()
    case 'comment.created':
      return m.webhooks_event_comment_created_label()
    case 'comment.updated':
      return m.webhooks_event_comment_updated_label()
    case 'comment.deleted':
      return m.webhooks_event_comment_deleted_label()
    case 'changelog.published':
      return m.webhooks_event_changelog_published_label()
    default:
      return eventId
  }
}

function getWebhookEventDescription(eventId: string) {
  switch (eventId) {
    case 'post.created':
      return m.webhooks_event_post_created_description()
    case 'post.status_changed':
      return m.webhooks_event_post_status_changed_description()
    case 'post.updated':
      return m.webhooks_event_post_updated_description()
    case 'post.deleted':
      return m.webhooks_event_post_deleted_description()
    case 'post.restored':
      return m.webhooks_event_post_restored_description()
    case 'post.merged':
      return m.webhooks_event_post_merged_description()
    case 'post.unmerged':
      return m.webhooks_event_post_unmerged_description()
    case 'comment.created':
      return m.webhooks_event_comment_created_description()
    case 'comment.updated':
      return m.webhooks_event_comment_updated_description()
    case 'comment.deleted':
      return m.webhooks_event_comment_deleted_description()
    case 'changelog.published':
      return m.webhooks_event_changelog_published_description()
    default:
      return eventId
  }
}

'use client'

import { useState, useTransition, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { updateWebhookFn } from '@/lib/server/functions/webhooks'
import { ArrowPathIcon } from '@heroicons/react/24/outline'
import { CopyButton } from '@/components/shared/copy-button'
import { WarningBox } from '@/components/shared/warning-box'
import {
  WEBHOOK_EVENTS,
  WEBHOOK_EVENT_CONFIG,
} from '@/lib/server/events/integrations/webhook/constants'
import { RotateWebhookSecretDialog } from './rotate-webhook-secret-dialog'
import type { Webhook } from '@/lib/server/domains/webhooks'
import * as m from '@/paraglide/messages'

interface EditWebhookDialogProps {
  webhook: Webhook
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditWebhookDialog({ webhook, open, onOpenChange }: EditWebhookDialogProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [isPending, startTransition] = useTransition()

  // Form state
  const [url, setUrl] = useState(webhook.url)
  const [selectedEvents, setSelectedEvents] = useState<string[]>(webhook.events)
  const [isEnabled, setIsEnabled] = useState(webhook.status === 'active')
  const [error, setError] = useState<string | null>(null)

  // Rotate secret state
  const [rotateDialogOpen, setRotateDialogOpen] = useState(false)
  const [newSecret, setNewSecret] = useState<string | null>(null)
  const translatedEventConfig = WEBHOOK_EVENT_CONFIG.map((event) => ({
    ...event,
    label: getWebhookEventLabel(event.id),
    description: getWebhookEventDescription(event.id),
  }))

  // Reset form when webhook changes
  useEffect(() => {
    setUrl(webhook.url)
    setSelectedEvents(webhook.events)
    setIsEnabled(webhook.status === 'active')
    setError(null)
    setNewSecret(null)
  }, [webhook])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (selectedEvents.length === 0) {
      setError(m.webhooks_select_at_least_one_event())
      return
    }

    try {
      await updateWebhookFn({
        data: {
          webhookId: webhook.id,
          url,
          events: selectedEvents as (typeof WEBHOOK_EVENTS)[number][],
          status: isEnabled ? 'active' : 'disabled',
        },
      })

      startTransition(() => {
        queryClient.invalidateQueries({ queryKey: ['admin', 'webhooks'] })
        router.invalidate()
      })

      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : m.webhooks_update_failed())
    }
  }

  const toggleEvent = (eventId: string) => {
    setSelectedEvents((prev) =>
      prev.includes(eventId) ? prev.filter((e) => e !== eventId) : [...prev, eventId]
    )
  }

  const handleSecretRotated = (secret: string) => {
    setNewSecret(secret)
  }

  const wasAutoDisabled = webhook.status === 'disabled' && webhook.failureCount >= 50

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{m.webhooks_edit_title()}</DialogTitle>
            <DialogDescription>{m.webhooks_edit_description()}</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-url">{m.webhooks_endpoint_url_label()}</Label>
                <Input
                  id="edit-url"
                  type="url"
                  placeholder={m.webhooks_endpoint_url_placeholder()}
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={isPending}
                  required
                />
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

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <Label htmlFor="webhook-enabled" className="text-sm font-medium">
                    {m.webhooks_enabled_label()}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {wasAutoDisabled
                      ? m.webhooks_reenable_resets_failures()
                      : m.webhooks_disabled_description()}
                  </p>
                </div>
                <Switch
                  id="webhook-enabled"
                  checked={isEnabled}
                  onCheckedChange={setIsEnabled}
                  disabled={isPending}
                  aria-label={m.webhooks_toggle_enabled_aria()}
                />
              </div>

              {wasAutoDisabled && (
                <WarningBox
                  variant="warning"
                  title={m.webhooks_auto_disabled_after_failures({
                    count: String(webhook.failureCount),
                  })}
                  description={
                    webhook.lastError
                      ? m.webhooks_last_error({ error: webhook.lastError })
                      : undefined
                  }
                />
              )}

              {/* Rotate Secret Section */}
              <div className="space-y-2">
                <Label>{m.webhooks_signing_secret_label()}</Label>
                {newSecret ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 rounded-lg bg-green-500/10 border border-green-500/20 p-3">
                      <code className="flex-1 text-sm font-mono break-all">{newSecret}</code>
                      <CopyButton
                        value={newSecret}
                        variant="ghost"
                        size="sm"
                        aria-label={m.webhooks_copy_secret_aria()}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">{m.webhooks_save_secret_now()}</p>
                  </div>
                ) : (
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <p className="text-sm text-muted-foreground">
                      {m.webhooks_rotate_generate_secret()}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setRotateDialogOpen(true)}
                      disabled={isPending}
                      aria-label={m.webhooks_rotate_secret_aria()}
                    >
                      <ArrowPathIcon className="h-4 w-4 mr-1.5" />
                      {m.webhooks_rotate_secret_button()}
                    </Button>
                  </div>
                )}
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                {m.common_cancel()}
              </Button>
              <Button type="submit" disabled={isPending || !url || selectedEvents.length === 0}>
                {isPending ? m.common_saving() : m.common_save_changes()}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <RotateWebhookSecretDialog
        webhook={webhook}
        open={rotateDialogOpen}
        onOpenChange={setRotateDialogOpen}
        onSecretRotated={handleSecretRotated}
      />
    </>
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

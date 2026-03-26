'use client'

import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { PlusIcon, BoltIcon, TrashIcon, PencilIcon } from '@heroicons/react/24/outline'
import { EmptyState } from '@/components/shared/empty-state'
import { EllipsisVerticalIcon } from '@heroicons/react/24/solid'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { CreateWebhookDialog } from './create-webhook-dialog'
import { EditWebhookDialog } from './edit-webhook-dialog'
import { DeleteWebhookDialog } from './delete-webhook-dialog'
import type { Webhook } from '@/lib/server/domains/webhooks'
import * as m from '@/paraglide/messages'

interface WebhooksSettingsProps {
  webhooks: Webhook[]
}

export function WebhooksSettings({ webhooks }: WebhooksSettingsProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editWebhook, setEditWebhook] = useState<Webhook | null>(null)
  const [deleteWebhook, setDeleteWebhook] = useState<Webhook | null>(null)

  const getStatusBadge = (webhook: Webhook) => {
    if (webhook.status === 'disabled') {
      if (webhook.failureCount >= 50) {
        return (
          <Badge
            variant="destructive"
            title={m.webhooks_auto_disabled_after_failures({ count: String(webhook.failureCount) })}
          >
            {m.webhooks_auto_disabled_badge()}
          </Badge>
        )
      }
      return <Badge variant="secondary">{m.webhooks_disabled_badge()}</Badge>
    }
    if (webhook.failureCount >= 25) {
      return (
        <Badge
          variant="destructive"
          title={m.webhooks_consecutive_failures({ count: String(webhook.failureCount) })}
        >
          {m.webhooks_failing_badge({ count: String(webhook.failureCount) })}
        </Badge>
      )
    }
    if (webhook.failureCount > 0) {
      return (
        <Badge
          variant="outline"
          title={m.webhooks_consecutive_failures({ count: String(webhook.failureCount) })}
        >
          {m.webhooks_issues_badge({ count: String(webhook.failureCount) })}
        </Badge>
      )
    }
    return <Badge variant="default">{m.webhooks_active_badge()}</Badge>
  }

  return (
    <div className="space-y-4">
      {/* Empty state */}
      {webhooks.length === 0 && (
        <div className="rounded-lg border border-dashed">
          <EmptyState
            icon={BoltIcon}
            title={m.webhooks_empty_title()}
            description={m.webhooks_empty_description()}
            action={
              <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
                <PlusIcon className="h-4 w-4 mr-1.5" />
                {m.webhooks_create_first_button()}
              </Button>
            }
          />
        </div>
      )}

      {/* Header with create button */}
      {webhooks.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {m.webhooks_usage_count({ count: String(webhooks.length), limit: '25' })}
          </p>
          <Button
            size="sm"
            onClick={() => setCreateDialogOpen(true)}
            disabled={webhooks.length >= 25}
          >
            <PlusIcon className="h-4 w-4 mr-1.5" />
            {m.webhooks_create_button()}
          </Button>
        </div>
      )}

      {/* Webhooks list */}
      {webhooks.length > 0 && (
        <div className="space-y-3">
          {webhooks.map((webhook) => (
            <div
              key={webhook.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-border/50 p-4"
            >
              <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <BoltIcon className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p
                      className="text-sm font-medium truncate max-w-[200px] sm:max-w-[300px]"
                      title={webhook.url}
                    >
                      {webhook.url}
                    </p>
                    {getStatusBadge(webhook)}
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-xs text-muted-foreground mt-1">
                    <span className="truncate">
                      {webhook.events.map((e) => getWebhookEventLabel(e)).join(', ')}
                    </span>
                    {webhook.lastTriggeredAt && (
                      <>
                        <span className="hidden sm:inline">·</span>
                        <span>
                          {m.webhooks_last_fired_prefix()}{' '}
                          {formatDistanceToNow(webhook.lastTriggeredAt, { addSuffix: true })}
                        </span>
                      </>
                    )}
                  </div>
                  {webhook.lastError && webhook.failureCount > 0 && (
                    <p className="text-xs text-destructive mt-1 truncate" title={webhook.lastError}>
                      {m.webhooks_error_prefix()} {webhook.lastError}
                    </p>
                  )}
                </div>
              </div>

              {/* Desktop: show buttons */}
              <div className="hidden sm:flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditWebhook(webhook)}
                  aria-label={m.webhooks_edit_aria({ url: webhook.url })}
                >
                  <PencilIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDeleteWebhook(webhook)}
                  aria-label={m.webhooks_delete_aria({ url: webhook.url })}
                  className="text-destructive hover:text-destructive"
                >
                  <TrashIcon className="h-4 w-4" />
                </Button>
              </div>

              {/* Mobile: dropdown menu */}
              <div className="sm:hidden self-end">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" aria-label={m.webhooks_actions_aria()}>
                      <EllipsisVerticalIcon className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEditWebhook(webhook)}>
                      <PencilIcon className="h-4 w-4 mr-2" />
                      {m.webhooks_edit_title()}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setDeleteWebhook(webhook)}
                      className="text-destructive focus:text-destructive"
                    >
                      <TrashIcon className="h-4 w-4 mr-2" />
                      {m.webhooks_delete_title()}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialogs */}
      <CreateWebhookDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />

      {editWebhook && (
        <EditWebhookDialog
          webhook={editWebhook}
          open={!!editWebhook}
          onOpenChange={(open) => !open && setEditWebhook(null)}
        />
      )}

      {deleteWebhook && (
        <DeleteWebhookDialog
          webhook={deleteWebhook}
          open={!!deleteWebhook}
          onOpenChange={(open) => !open && setDeleteWebhook(null)}
        />
      )}
    </div>
  )
}

function getWebhookEventLabel(eventId: string) {
  switch (eventId) {
    case 'post.created':
      return m.webhooks_event_post_created_short()
    case 'post.status_changed':
      return m.webhooks_event_post_status_changed_short()
    case 'post.updated':
      return m.webhooks_event_post_updated_short()
    case 'post.deleted':
      return m.webhooks_event_post_deleted_short()
    case 'post.restored':
      return m.webhooks_event_post_restored_short()
    case 'post.merged':
      return m.webhooks_event_post_merged_short()
    case 'post.unmerged':
      return m.webhooks_event_post_unmerged_short()
    case 'comment.created':
      return m.webhooks_event_comment_created_short()
    case 'comment.updated':
      return m.webhooks_event_comment_updated_short()
    case 'comment.deleted':
      return m.webhooks_event_comment_deleted_short()
    case 'changelog.published':
      return m.webhooks_event_changelog_published_short()
    default:
      return eventId
  }
}

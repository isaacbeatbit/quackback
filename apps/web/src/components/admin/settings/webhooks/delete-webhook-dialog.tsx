'use client'

import { useState, useTransition } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { deleteWebhookFn } from '@/lib/server/functions/webhooks'
import type { Webhook } from '@/lib/server/domains/webhooks'
import * as m from '@/paraglide/messages'

interface DeleteWebhookDialogProps {
  webhook: Webhook
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeleteWebhookDialog({ webhook, open, onOpenChange }: DeleteWebhookDialogProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async () => {
    setError(null)

    try {
      await deleteWebhookFn({ data: { webhookId: webhook.id } })

      startTransition(() => {
        queryClient.invalidateQueries({ queryKey: ['admin', 'webhooks'] })
        router.invalidate()
      })

      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : m.webhooks_delete_failed())
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={m.webhooks_delete_title()}
      description={m.webhooks_delete_description()}
      warning={{
        title: m.webhooks_delete_warning_title(),
        description: (
          <>
            {m.webhooks_delete_warning_prefix()}{' '}
            <code className="bg-muted px-1 rounded text-xs">{webhook.url}</code>{' '}
            {m.webhooks_delete_warning_suffix()}
          </>
        ),
      }}
      variant="destructive"
      confirmLabel={isPending ? m.webhooks_deleting() : m.webhooks_delete_button()}
      isPending={isPending}
      onConfirm={handleDelete}
    >
      {error && <p className="text-sm text-destructive">{error}</p>}
    </ConfirmDialog>
  )
}

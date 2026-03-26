'use client'

import { useState, useTransition } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { WarningBox } from '@/components/shared/warning-box'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { rotateWebhookSecretFn } from '@/lib/server/functions/webhooks'
import type { Webhook } from '@/lib/server/domains/webhooks'
import * as m from '@/paraglide/messages'

interface RotateWebhookSecretDialogProps {
  webhook: Webhook
  open: boolean
  onOpenChange: (open: boolean) => void
  onSecretRotated: (secret: string) => void
}

export function RotateWebhookSecretDialog({
  webhook,
  open,
  onOpenChange,
  onSecretRotated,
}: RotateWebhookSecretDialogProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleRotate = async () => {
    setError(null)

    try {
      const result = await rotateWebhookSecretFn({ data: { webhookId: webhook.id } })

      startTransition(() => {
        queryClient.invalidateQueries({ queryKey: ['admin', 'webhooks'] })
        router.invalidate()
      })

      onSecretRotated(result.secret)
      onOpenChange(false)
    } catch (err) {
      console.error('Failed to rotate webhook secret:', err)
      setError(err instanceof Error ? err.message : m.webhooks_rotate_secret_failed())
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{m.webhooks_rotate_secret_title()}</DialogTitle>
          <DialogDescription>{m.webhooks_rotate_secret_description()}</DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <WarningBox
            variant="warning"
            title={m.webhooks_old_secret_stops_title()}
            description={m.webhooks_old_secret_stops_description()}
          />

          <div className="mt-4 rounded-lg border p-3 bg-muted/30">
            <p className="text-xs text-muted-foreground">
              <strong>{m.webhooks_endpoint_label()}</strong>{' '}
              <code className="font-mono text-foreground break-all">{webhook.url}</code>
            </p>
          </div>

          {error && <p className="text-sm text-destructive mt-4">{error}</p>}
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
          <Button onClick={handleRotate} disabled={isPending}>
            {isPending ? m.webhooks_rotating() : m.webhooks_rotate_secret_button()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

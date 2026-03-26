import { useState } from 'react'
import { ArrowPathIcon, CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/solid'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { saveZapierWebhookFn } from '@/lib/server/integrations/zapier/functions'
import { useDeleteIntegration } from '@/lib/client/mutations'
import * as m from '@/paraglide/messages'

interface ZapierConnectionActionsProps {
  integrationId?: string
  isConnected: boolean
  webhookUrl?: string
}

export function ZapierConnectionActions({
  integrationId,
  isConnected,
  webhookUrl,
}: ZapierConnectionActionsProps) {
  const deleteMutation = useDeleteIntegration()
  const [url, setUrl] = useState(webhookUrl || '')
  const [saving, setSaving] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [disconnectDialogOpen, setDisconnectDialogOpen] = useState(false)

  const handleSave = async () => {
    if (!url.trim()) return

    setSaving(true)
    setError(null)
    setShowSuccess(false)
    try {
      await saveZapierWebhookFn({ data: { webhookUrl: url.trim() } })
      setShowSuccess(true)
      const timer = setTimeout(() => setShowSuccess(false), 3000)
      return () => clearTimeout(timer)
    } catch (err) {
      setError(err instanceof Error ? err.message : m.integration_zapier_save_failed())
    } finally {
      setSaving(false)
    }
  }

  const handleDisconnect = () => {
    if (!integrationId) return
    deleteMutation.mutate({ id: integrationId })
  }

  const disconnecting = deleteMutation.isPending

  if (isConnected) {
    return (
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={disconnecting}
          onClick={() => setDisconnectDialogOpen(true)}
        >
          {disconnecting ? (
            <>
              <ArrowPathIcon className="mr-2 h-4 w-4 animate-spin" />
              {m.common_disconnecting()}
            </>
          ) : (
            m.common_disconnect()
          )}
        </Button>
        <ConfirmDialog
          open={disconnectDialogOpen}
          onOpenChange={setDisconnectDialogOpen}
          title={m.integration_disconnect_title({ provider: 'Zapier' })}
          description={m.integration_zapier_disconnect_description()}
          confirmLabel={m.common_disconnect()}
          isPending={disconnecting}
          onConfirm={handleDisconnect}
        />
      </div>
    )
  }

  return (
    <>
      {showSuccess && (
        <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-600 dark:text-green-400">
          <CheckCircleIcon className="h-4 w-4" />
          <span>{m.integration_webhook_saved_verified()}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <ExclamationCircleIcon className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="webhook-url" className="text-sm">
          {m.integration_webhook_url_label()}
        </Label>
        <div className="flex gap-2">
          <Input
            id="webhook-url"
            type="url"
            placeholder={m.integration_zapier_webhook_placeholder()}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={saving}
            className="flex-1"
          />
          <Button onClick={handleSave} disabled={saving || !url.trim()}>
            {saving ? (
              <>
                <ArrowPathIcon className="mr-2 h-4 w-4 animate-spin" />
                {m.common_saving()}
              </>
            ) : (
              m.common_save_changes()
            )}
          </Button>
        </div>
      </div>
    </>
  )
}

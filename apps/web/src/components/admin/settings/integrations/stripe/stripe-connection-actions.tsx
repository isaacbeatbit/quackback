import { useState } from 'react'
import { ArrowPathIcon, CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/solid'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { saveStripeKeyFn } from '@/lib/server/integrations/stripe/functions'
import { useDeleteIntegration } from '@/lib/client/mutations'
import * as m from '@/paraglide/messages'

interface StripeConnectionActionsProps {
  integrationId?: string
  isConnected: boolean
  apiKey?: string
}

export function StripeConnectionActions({
  integrationId,
  isConnected,
  apiKey,
}: StripeConnectionActionsProps) {
  const deleteMutation = useDeleteIntegration()
  const [key, setKey] = useState(apiKey || '')
  const [saving, setSaving] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [disconnectDialogOpen, setDisconnectDialogOpen] = useState(false)

  const handleSave = async () => {
    if (!key.trim()) return

    setSaving(true)
    setError(null)
    setShowSuccess(false)
    try {
      await saveStripeKeyFn({ data: { apiKey: key.trim() } })
      setShowSuccess(true)
      const timer = setTimeout(() => setShowSuccess(false), 3000)
      return () => clearTimeout(timer)
    } catch (err) {
      setError(err instanceof Error ? err.message : m.integration_stripe_save_failed())
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
          title={m.integration_disconnect_title({ provider: 'Stripe' })}
          description={m.integration_stripe_disconnect_description()}
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
          <span>{m.integration_api_key_saved_verified()}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <ExclamationCircleIcon className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="api-key" className="text-sm">
          {m.integration_stripe_api_key_label()}
        </Label>
        <div className="flex gap-2">
          <Input
            id="api-key"
            type="password"
            placeholder={m.integration_stripe_api_key_placeholder()}
            value={key}
            onChange={(e) => setKey(e.target.value)}
            disabled={saving}
            className="flex-1"
          />
          <Button onClick={handleSave} disabled={saving || !key.trim()}>
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
        <p className="text-xs text-muted-foreground">{m.integration_stripe_api_key_help()}</p>
      </div>
    </>
  )
}

'use client'

import { useState } from 'react'
import { ArrowPathIcon, CheckCircleIcon } from '@heroicons/react/24/solid'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { saveShortcutTokenFn } from '@/lib/server/integrations/shortcut/functions'
import { useDeleteIntegration } from '@/lib/client/mutations'
import { useQueryClient } from '@tanstack/react-query'
import * as m from '@/paraglide/messages'

interface ShortcutConnectionActionsProps {
  integrationId?: string
  isConnected: boolean
}

export function ShortcutConnectionActions({
  integrationId,
  isConnected,
}: ShortcutConnectionActionsProps) {
  const queryClient = useQueryClient()
  const deleteMutation = useDeleteIntegration()
  const [apiToken, setApiToken] = useState('')
  const [saving, setSaving] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [disconnectDialogOpen, setDisconnectDialogOpen] = useState(false)

  const handleSaveToken = async () => {
    if (!apiToken.trim()) return
    setSaving(true)
    setError(null)
    try {
      await saveShortcutTokenFn({ data: { apiToken: apiToken.trim() } })
      setApiToken('')
      setShowSuccess(true)
      queryClient.invalidateQueries({ queryKey: ['admin', 'integrations'] })
      const timer = setTimeout(() => setShowSuccess(false), 3000)
      return () => clearTimeout(timer)
    } catch (err) {
      setError(err instanceof Error ? err.message : m.integration_shortcut_save_failed())
    } finally {
      setSaving(false)
    }
  }

  const handleDisconnect = () => {
    if (!integrationId) return
    deleteMutation.mutate({ id: integrationId })
  }

  const disconnecting = deleteMutation.isPending

  return (
    <>
      {showSuccess && (
        <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-600 dark:text-green-400">
          <CheckCircleIcon className="h-4 w-4" />
          <span>{m.integration_api_key_saved_verified()}</span>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {!isConnected && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="shortcut-token" className="text-sm">
            {m.integration_shortcut_api_token_label()}
          </Label>
          <div className="flex items-center gap-2">
            <Input
              id="shortcut-token"
              type="password"
              placeholder={m.integration_shortcut_api_token_placeholder()}
              value={apiToken}
              onChange={(e) => setApiToken(e.target.value)}
              disabled={saving}
              className="w-64"
            />
            <Button onClick={handleSaveToken} disabled={saving || !apiToken.trim()}>
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
      )}

      {isConnected && (
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
            title={m.integration_disconnect_title({ provider: 'Shortcut' })}
            description={m.integration_shortcut_disconnect_description()}
            confirmLabel={m.common_disconnect()}
            isPending={disconnecting}
            onConfirm={handleDisconnect}
          />
        </div>
      )}
    </>
  )
}

import { useState } from 'react'
import { ArrowPathIcon, CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/solid'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { connectAzureDevOpsFn } from '@/lib/server/integrations/azure-devops/functions'
import { useDeleteIntegration } from '@/lib/client/mutations'
import * as m from '@/paraglide/messages'

interface AzureDevOpsConnectionActionsProps {
  integrationId?: string
  isConnected: boolean
}

export function AzureDevOpsConnectionActions({
  integrationId,
  isConnected,
}: AzureDevOpsConnectionActionsProps) {
  const deleteMutation = useDeleteIntegration()
  const [organizationUrl, setOrganizationUrl] = useState('')
  const [pat, setPat] = useState('')
  const [saving, setSaving] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [disconnectDialogOpen, setDisconnectDialogOpen] = useState(false)

  const handleConnect = async () => {
    if (!organizationUrl.trim() || !pat.trim()) return

    setSaving(true)
    setError(null)
    setShowSuccess(false)
    try {
      await connectAzureDevOpsFn({
        data: { organizationUrl: organizationUrl.trim(), pat: pat.trim() },
      })
      setShowSuccess(true)
      setPat('')
      const timer = setTimeout(() => setShowSuccess(false), 3000)
      return () => clearTimeout(timer)
    } catch (err) {
      setError(err instanceof Error ? err.message : m.integration_azure_devops_connect_failed())
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
          title={m.integration_disconnect_title({ provider: 'Azure DevOps' })}
          description={m.integration_azure_devops_disconnect_description()}
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
          <span>{m.integration_connected_success()}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <ExclamationCircleIcon className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex w-full max-w-md flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="org-url" className="text-sm">
            {m.integration_azure_devops_org_url_label()}
          </Label>
          <Input
            id="org-url"
            type="url"
            placeholder={m.integration_azure_devops_org_url_placeholder()}
            value={organizationUrl}
            onChange={(e) => setOrganizationUrl(e.target.value)}
            disabled={saving}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pat" className="text-sm">
            {m.integration_azure_devops_pat_label()}
          </Label>
          <Input
            id="pat"
            type="password"
            placeholder={m.integration_azure_devops_pat_placeholder()}
            value={pat}
            onChange={(e) => setPat(e.target.value)}
            disabled={saving}
          />
        </div>
        <Button
          onClick={handleConnect}
          disabled={saving || !organizationUrl.trim() || !pat.trim()}
          className="self-end"
        >
          {saving ? (
            <>
              <ArrowPathIcon className="mr-2 h-4 w-4 animate-spin" />
              {m.common_connecting()}
            </>
          ) : (
            m.common_connect()
          )}
        </Button>
      </div>
    </>
  )
}

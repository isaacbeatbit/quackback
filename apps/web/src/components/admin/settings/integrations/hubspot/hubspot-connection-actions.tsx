'use client'

import { useState, useEffect } from 'react'
import { useSearch } from '@tanstack/react-router'
import { ArrowPathIcon, CheckCircleIcon } from '@heroicons/react/24/solid'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { getHubSpotConnectUrl } from '@/lib/server/integrations/hubspot/functions'
import { useDeleteIntegration } from '@/lib/client/mutations'
import * as m from '@/paraglide/messages'

interface HubSpotConnectionActionsProps {
  integrationId?: string
  isConnected: boolean
}

export function HubSpotConnectionActions({
  integrationId,
  isConnected,
}: HubSpotConnectionActionsProps) {
  const search = useSearch({ strict: false })
  const deleteMutation = useDeleteIntegration()
  const [showSuccess, setShowSuccess] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [disconnectDialogOpen, setDisconnectDialogOpen] = useState(false)

  useEffect(() => {
    const searchParams = search as { hubspot?: string }
    if (searchParams.hubspot !== 'connected') return

    setShowSuccess(true)
    const url = new URL(window.location.href)
    url.searchParams.delete('hubspot')
    window.history.replaceState({}, '', url.toString())

    const timer = setTimeout(() => setShowSuccess(false), 3000)
    return () => clearTimeout(timer)
  }, [search])

  const handleConnect = async () => {
    setConnecting(true)
    try {
      const url = await getHubSpotConnectUrl()
      window.location.href = url
    } catch (err) {
      console.error('Failed to get connect URL:', err)
      setConnecting(false)
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
          <span>{m.integration_connected_success()}</span>
        </div>
      )}

      <div className="flex items-center gap-2">
        {!isConnected && (
          <Button onClick={handleConnect} disabled={connecting}>
            {connecting ? (
              <>
                <ArrowPathIcon className="mr-2 h-4 w-4 animate-spin" />
                {m.common_connecting()}
              </>
            ) : (
              m.common_connect()
            )}
          </Button>
        )}

        {isConnected && (
          <>
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
              title={m.integration_disconnect_title({ provider: 'HubSpot' })}
              description={m.integration_hubspot_disconnect_description()}
              confirmLabel={m.common_disconnect()}
              isPending={disconnecting}
              onConfirm={handleDisconnect}
            />
          </>
        )}
      </div>
    </>
  )
}

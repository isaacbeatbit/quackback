'use client'

import { useState, useEffect } from 'react'
import { useSearch } from '@tanstack/react-router'
import { ArrowPathIcon, CheckCircleIcon } from '@heroicons/react/24/solid'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { getZendeskConnectUrl } from '@/lib/server/integrations/zendesk/functions'
import { useDeleteIntegration } from '@/lib/client/mutations'
import * as m from '@/paraglide/messages'

interface ZendeskConnectionActionsProps {
  integrationId?: string
  isConnected: boolean
}

const SUBDOMAIN_PATTERN = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/

export function ZendeskConnectionActions({
  integrationId,
  isConnected,
}: ZendeskConnectionActionsProps) {
  const search = useSearch({ strict: false })
  const deleteMutation = useDeleteIntegration()
  const [showSuccess, setShowSuccess] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [disconnectDialogOpen, setDisconnectDialogOpen] = useState(false)
  const [subdomain, setSubdomain] = useState('')
  const [subdomainError, setSubdomainError] = useState('')

  useEffect(() => {
    const searchParams = search as { zendesk?: string }
    if (searchParams.zendesk !== 'connected') return

    setShowSuccess(true)
    const url = new URL(window.location.href)
    url.searchParams.delete('zendesk')
    window.history.replaceState({}, '', url.toString())

    const timer = setTimeout(() => setShowSuccess(false), 3000)
    return () => clearTimeout(timer)
  }, [search])

  const handleConnect = async () => {
    const trimmed = subdomain.trim().toLowerCase()
    if (!trimmed) {
      setSubdomainError(m.integration_zendesk_subdomain_required())
      return
    }
    if (!SUBDOMAIN_PATTERN.test(trimmed)) {
      setSubdomainError(m.integration_zendesk_subdomain_invalid())
      return
    }
    setSubdomainError('')
    setConnecting(true)
    try {
      const url = await getZendeskConnectUrl({ data: { subdomain: trimmed } })
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

      {!isConnected && (
        <div className="flex w-full flex-col gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="zendesk-subdomain">{m.integration_zendesk_subdomain_label()}</Label>
            <div className="flex items-center gap-2">
              <Input
                id="zendesk-subdomain"
                placeholder={m.integration_zendesk_subdomain_placeholder()}
                value={subdomain}
                onChange={(e) => {
                  setSubdomain(e.target.value)
                  setSubdomainError('')
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
                className="max-w-[200px]"
              />
              <span className="text-muted-foreground text-sm">
                {m.integration_zendesk_domain_suffix()}
              </span>
            </div>
            {subdomainError && <p className="text-destructive text-sm">{subdomainError}</p>}
          </div>
          <div className="flex justify-end">
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
            title={m.integration_disconnect_title({ provider: 'Zendesk' })}
            description={m.integration_zendesk_disconnect_description()}
            confirmLabel={m.common_disconnect()}
            isPending={disconnecting}
            onConfirm={handleDisconnect}
          />
        </div>
      )}
    </>
  )
}

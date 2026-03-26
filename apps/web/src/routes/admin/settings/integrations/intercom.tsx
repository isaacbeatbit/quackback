import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { adminQueries } from '@/lib/client/queries/admin'
import { IntegrationHeader } from '@/components/admin/settings/integrations/integration-header'
import { IntegrationSetupCard } from '@/components/admin/settings/integrations/integration-setup-card'
import { PlatformCredentialsDialog } from '@/components/admin/settings/integrations/platform-credentials-dialog'
import { IntercomConnectionActions } from '@/components/admin/settings/integrations/intercom/intercom-connection-actions'
import { Button } from '@/components/ui/button'
import { IntercomIcon } from '@/components/icons/integration-icons'
import { intercomCatalog } from '@/lib/server/integrations/intercom/catalog'
import { CheckCircleIcon } from '@heroicons/react/24/solid'
import * as m from '@/paraglide/messages'

export const Route = createFileRoute('/admin/settings/integrations/intercom')({
  loader: async ({ context }) => {
    const { queryClient } = context
    await queryClient.ensureQueryData(adminQueries.integrationByType('intercom'))
    return {}
  },
  component: IntercomIntegrationPage,
})

function IntercomIntegrationPage() {
  const integrationQuery = useSuspenseQuery(adminQueries.integrationByType('intercom'))
  const { integration, platformCredentialFields, platformCredentialsConfigured } =
    integrationQuery.data
  const [credentialsOpen, setCredentialsOpen] = useState(false)

  const isConnected = integration?.status === 'active'
  const isPaused = integration?.status === 'paused'

  return (
    <div className="space-y-6">
      <IntegrationHeader
        catalog={intercomCatalog}
        status={integration?.status as 'active' | 'paused' | 'pending' | null}
        workspaceName={integration?.workspaceName}
        icon={<IntercomIcon className="h-6 w-6 text-white" />}
        actions={
          isConnected || isPaused ? (
            <div className="flex items-center gap-2">
              {platformCredentialFields.length > 0 && (
                <Button variant="outline" size="sm" onClick={() => setCredentialsOpen(true)}>
                  {m.integration_configure_credentials()}
                </Button>
              )}
              <IntercomConnectionActions integrationId={integration?.id} isConnected={true} />
            </div>
          ) : undefined
        }
      />

      {integration && (isConnected || isPaused) && (
        <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <CheckCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
            <p className="text-sm text-foreground">{m.integration_intercom_active_message()}</p>
          </div>
        </div>
      )}

      {!integration && (
        <IntegrationSetupCard
          icon={<IntercomIcon className="h-6 w-6 text-muted-foreground" />}
          title={m.integration_intercom_title()}
          description={m.integration_intercom_description()}
          steps={[
            <p key="1">{m.integration_intercom_setup_step_1()}</p>,
            <p key="2">{m.integration_intercom_setup_step_2()}</p>,
            <p key="3">{m.integration_intercom_setup_step_3()}</p>,
          ]}
          connectionForm={
            <div className="flex flex-col items-end gap-2">
              {platformCredentialFields.length > 0 && !platformCredentialsConfigured && (
                <Button onClick={() => setCredentialsOpen(true)}>
                  {m.integration_configure_credentials()}
                </Button>
              )}
              {platformCredentialsConfigured && (
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setCredentialsOpen(true)}>
                    {m.integration_configure_credentials()}
                  </Button>
                  <IntercomConnectionActions integrationId={undefined} isConnected={false} />
                </div>
              )}
            </div>
          }
        />
      )}

      {platformCredentialFields.length > 0 && (
        <PlatformCredentialsDialog
          integrationType="intercom"
          integrationName="Intercom"
          fields={platformCredentialFields}
          open={credentialsOpen}
          onOpenChange={setCredentialsOpen}
        />
      )}
    </div>
  )
}

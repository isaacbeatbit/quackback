import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { adminQueries } from '@/lib/client/queries/admin'
import { IntegrationHeader } from '@/components/admin/settings/integrations/integration-header'
import { IntegrationSetupCard } from '@/components/admin/settings/integrations/integration-setup-card'
import { PlatformCredentialsDialog } from '@/components/admin/settings/integrations/platform-credentials-dialog'
import { TeamsConnectionActions } from '@/components/admin/settings/integrations/teams/teams-connection-actions'
import { TeamsConfig } from '@/components/admin/settings/integrations/teams/teams-config'
import { Button } from '@/components/ui/button'
import { TeamsIcon } from '@/components/icons/integration-icons'
import { teamsCatalog } from '@/lib/server/integrations/teams/catalog'
import * as m from '@/paraglide/messages'

export const Route = createFileRoute('/admin/settings/integrations/teams')({
  loader: async ({ context }) => {
    const { queryClient } = context
    await queryClient.ensureQueryData(adminQueries.integrationByType('teams'))
    return {}
  },
  component: TeamsIntegrationPage,
})

function TeamsIntegrationPage() {
  const integrationQuery = useSuspenseQuery(adminQueries.integrationByType('teams'))
  const { integration, platformCredentialFields, platformCredentialsConfigured } =
    integrationQuery.data
  const [credentialsOpen, setCredentialsOpen] = useState(false)

  const isConnected = integration?.status === 'active'
  const isPaused = integration?.status === 'paused'

  return (
    <div className="space-y-6">
      <IntegrationHeader
        catalog={teamsCatalog}
        status={integration?.status as 'active' | 'paused' | 'pending' | null}
        workspaceName={integration?.workspaceName}
        icon={<TeamsIcon className="h-6 w-6 text-white" />}
        actions={
          isConnected || isPaused ? (
            <div className="flex items-center gap-2">
              {platformCredentialFields.length > 0 && (
                <Button variant="outline" size="sm" onClick={() => setCredentialsOpen(true)}>
                  {m.integration_configure_credentials()}
                </Button>
              )}
              <TeamsConnectionActions integrationId={integration?.id} isConnected={true} />
            </div>
          ) : undefined
        }
      />

      {integration && (isConnected || isPaused) && (
        <div className="rounded-xl border border-border/50 bg-card p-6 shadow-sm">
          <TeamsConfig
            integrationId={integration.id}
            initialConfig={integration.config}
            initialEventMappings={integration.eventMappings}
            enabled={isConnected}
          />
        </div>
      )}

      {!integration && (
        <IntegrationSetupCard
          icon={<TeamsIcon className="h-6 w-6 text-muted-foreground" />}
          title={m.integration_teams_title()}
          description={m.integration_teams_description()}
          steps={[
            <p key="1">{m.integration_teams_setup_step_1()}</p>,
            <p key="2">{m.integration_teams_setup_step_2()}</p>,
            <p key="3">{m.integration_teams_setup_step_3()}</p>,
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
                  <TeamsConnectionActions integrationId={undefined} isConnected={false} />
                </div>
              )}
            </div>
          }
        />
      )}

      {platformCredentialFields.length > 0 && (
        <PlatformCredentialsDialog
          integrationType="teams"
          integrationName="Microsoft Teams"
          fields={platformCredentialFields}
          open={credentialsOpen}
          onOpenChange={setCredentialsOpen}
        />
      )}
    </div>
  )
}

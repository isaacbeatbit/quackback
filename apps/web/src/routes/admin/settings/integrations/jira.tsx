import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { adminQueries } from '@/lib/client/queries/admin'
import { IntegrationHeader } from '@/components/admin/settings/integrations/integration-header'
import { IntegrationSetupCard } from '@/components/admin/settings/integrations/integration-setup-card'
import { PlatformCredentialsDialog } from '@/components/admin/settings/integrations/platform-credentials-dialog'
import { JiraConnectionActions } from '@/components/admin/settings/integrations/jira/jira-connection-actions'
import { JiraConfig } from '@/components/admin/settings/integrations/jira/jira-config'
import { Button } from '@/components/ui/button'
import { JiraIcon } from '@/components/icons/integration-icons'
import { jiraCatalog } from '@/lib/server/integrations/jira/catalog'
import * as m from '@/paraglide/messages'

export const Route = createFileRoute('/admin/settings/integrations/jira')({
  loader: async ({ context }) => {
    const { queryClient } = context
    await queryClient.ensureQueryData(adminQueries.integrationByType('jira'))
    return {}
  },
  component: JiraIntegrationPage,
})

function JiraIntegrationPage() {
  const integrationQuery = useSuspenseQuery(adminQueries.integrationByType('jira'))
  const { integration, platformCredentialFields, platformCredentialsConfigured } =
    integrationQuery.data
  const [credentialsOpen, setCredentialsOpen] = useState(false)

  const isConnected = integration?.status === 'active'
  const isPaused = integration?.status === 'paused'

  return (
    <div className="space-y-6">
      <IntegrationHeader
        catalog={jiraCatalog}
        status={integration?.status as 'active' | 'paused' | 'pending' | null}
        workspaceName={integration?.workspaceName}
        icon={<JiraIcon className="h-6 w-6" />}
        actions={
          isConnected || isPaused ? (
            <div className="flex items-center gap-2">
              {platformCredentialFields.length > 0 && (
                <Button variant="outline" size="sm" onClick={() => setCredentialsOpen(true)}>
                  {m.integration_configure_credentials()}
                </Button>
              )}
              <JiraConnectionActions integrationId={integration?.id} isConnected={true} />
            </div>
          ) : undefined
        }
      />

      {integration && (isConnected || isPaused) && (
        <div className="rounded-xl border border-border/50 bg-card p-6 shadow-sm">
          <JiraConfig
            integrationId={integration.id}
            initialConfig={integration.config}
            initialEventMappings={integration.eventMappings}
            enabled={isConnected}
          />
        </div>
      )}

      {!integration && (
        <IntegrationSetupCard
          icon={<JiraIcon className="h-6 w-6 text-muted-foreground" />}
          title={m.integration_jira_title()}
          description={m.integration_jira_description()}
          steps={[
            <p key="1">{m.integration_jira_setup_step_1()}</p>,
            <p key="2">{m.integration_jira_setup_step_2()}</p>,
            <p key="3">{m.integration_jira_setup_step_3()}</p>,
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
                  <JiraConnectionActions integrationId={undefined} isConnected={false} />
                </div>
              )}
            </div>
          }
        />
      )}

      {platformCredentialFields.length > 0 && (
        <PlatformCredentialsDialog
          integrationType="jira"
          integrationName="Jira"
          fields={platformCredentialFields}
          open={credentialsOpen}
          onOpenChange={setCredentialsOpen}
        />
      )}
    </div>
  )
}

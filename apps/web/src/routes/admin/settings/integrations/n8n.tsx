import { createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { adminQueries } from '@/lib/client/queries/admin'
import { IntegrationHeader } from '@/components/admin/settings/integrations/integration-header'
import { IntegrationSetupCard } from '@/components/admin/settings/integrations/integration-setup-card'
import { N8nConnectionActions } from '@/components/admin/settings/integrations/n8n/n8n-connection-actions'
import { N8nConfig } from '@/components/admin/settings/integrations/n8n/n8n-config'
import { N8nIcon } from '@/components/icons/integration-icons'
import { n8nCatalog } from '@/lib/server/integrations/n8n/catalog'
import * as m from '@/paraglide/messages'

export const Route = createFileRoute('/admin/settings/integrations/n8n')({
  loader: async ({ context }) => {
    const { queryClient } = context
    await queryClient.ensureQueryData(adminQueries.integrationByType('n8n'))
    return {}
  },
  component: N8nIntegrationPage,
})

function N8nIntegrationPage() {
  const integrationQuery = useSuspenseQuery(adminQueries.integrationByType('n8n'))
  const { integration } = integrationQuery.data

  const isConnected = integration?.status === 'active'
  const isPaused = integration?.status === 'paused'

  return (
    <div className="space-y-6">
      <IntegrationHeader
        catalog={n8nCatalog}
        status={integration?.status as 'active' | 'paused' | 'pending' | null}
        workspaceName={integration?.workspaceName}
        icon={<N8nIcon className="h-6 w-6 text-white" />}
        actions={
          isConnected || isPaused ? (
            <N8nConnectionActions integrationId={integration?.id} isConnected={true} />
          ) : undefined
        }
      />

      {integration && (isConnected || isPaused) && (
        <div className="rounded-xl border border-border/50 bg-card p-6 shadow-sm">
          <N8nConfig
            integrationId={integration.id}
            initialEventMappings={integration.eventMappings}
            enabled={isConnected}
          />
        </div>
      )}

      {!integration && (
        <IntegrationSetupCard
          icon={<N8nIcon className="h-6 w-6 text-muted-foreground" />}
          title={m.integration_n8n_title()}
          description={m.integration_n8n_description()}
          steps={[
            <p key="1">{m.integration_n8n_setup_step_1()}</p>,
            <p key="2">{m.integration_n8n_setup_step_2()}</p>,
            <p key="3">{m.integration_n8n_setup_step_3()}</p>,
          ]}
          connectionForm={<N8nConnectionActions integrationId={undefined} isConnected={false} />}
        />
      )}
    </div>
  )
}

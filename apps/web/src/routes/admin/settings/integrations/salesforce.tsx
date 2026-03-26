import { createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { adminQueries } from '@/lib/client/queries/admin'
import { IntegrationHeader } from '@/components/admin/settings/integrations/integration-header'
import { IntegrationSetupCard } from '@/components/admin/settings/integrations/integration-setup-card'
import { SalesforceConnectionActions } from '@/components/admin/settings/integrations/salesforce/salesforce-connection-actions'
import { SalesforceConfig } from '@/components/admin/settings/integrations/salesforce/salesforce-config'
import { SalesforceIcon } from '@/components/icons/integration-icons'
import { salesforceCatalog } from '@/lib/server/integrations/salesforce/catalog'
import * as m from '@/paraglide/messages'

export const Route = createFileRoute('/admin/settings/integrations/salesforce')({
  loader: async ({ context }) => {
    const { queryClient } = context
    await queryClient.ensureQueryData(adminQueries.integrationByType('salesforce'))
    return {}
  },
  component: SalesforceIntegrationPage,
})

function SalesforceIntegrationPage() {
  const integrationQuery = useSuspenseQuery(adminQueries.integrationByType('salesforce'))
  const { integration } = integrationQuery.data

  const isConnected = integration?.status === 'active'
  const isPaused = integration?.status === 'paused'

  return (
    <div className="space-y-6">
      <IntegrationHeader
        catalog={salesforceCatalog}
        status={integration?.status as 'active' | 'paused' | 'pending' | null}
        workspaceName={integration?.workspaceName}
        icon={<SalesforceIcon className="h-6 w-6 text-white" />}
        actions={
          isConnected || isPaused ? (
            <SalesforceConnectionActions integrationId={integration?.id} isConnected={true} />
          ) : undefined
        }
      />

      {integration && (isConnected || isPaused) && (
        <div className="rounded-xl border border-border/50 bg-card p-6 shadow-sm">
          <SalesforceConfig
            integrationId={integration.id}
            initialEventMappings={integration.eventMappings}
            enabled={isConnected}
          />
        </div>
      )}

      {!integration && (
        <IntegrationSetupCard
          icon={<SalesforceIcon className="h-6 w-6 text-muted-foreground" />}
          title={m.integration_salesforce_title()}
          description={m.integration_salesforce_description()}
          steps={[
            <p key="1">{m.integration_salesforce_setup_step_1()}</p>,
            <p key="2">{m.integration_salesforce_setup_step_2()}</p>,
            <p key="3">{m.integration_salesforce_setup_step_3()}</p>,
          ]}
          connectionForm={
            <SalesforceConnectionActions integrationId={undefined} isConnected={false} />
          }
        />
      )}
    </div>
  )
}

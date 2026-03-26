import { createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { adminQueries } from '@/lib/client/queries/admin'
import { IntegrationHeader } from '@/components/admin/settings/integrations/integration-header'
import { IntegrationSetupCard } from '@/components/admin/settings/integrations/integration-setup-card'
import { ZapierConnectionActions } from '@/components/admin/settings/integrations/zapier/zapier-connection-actions'
import { ZapierConfig } from '@/components/admin/settings/integrations/zapier/zapier-config'
import { ZapierIcon } from '@/components/icons/integration-icons'
import { zapierCatalog } from '@/lib/server/integrations/zapier/catalog'
import * as m from '@/paraglide/messages'

export const Route = createFileRoute('/admin/settings/integrations/zapier')({
  loader: async ({ context }) => {
    const { queryClient } = context
    await queryClient.ensureQueryData(adminQueries.integrationByType('zapier'))
    return {}
  },
  component: ZapierIntegrationPage,
})

function ZapierIntegrationPage() {
  const integrationQuery = useSuspenseQuery(adminQueries.integrationByType('zapier'))
  const { integration } = integrationQuery.data

  const isConnected = integration?.status === 'active'
  const isPaused = integration?.status === 'paused'

  return (
    <div className="space-y-6">
      <IntegrationHeader
        catalog={zapierCatalog}
        status={integration?.status as 'active' | 'paused' | 'pending' | null}
        workspaceName={integration?.workspaceName}
        icon={<ZapierIcon className="h-6 w-6 text-white" />}
        actions={
          isConnected || isPaused ? (
            <ZapierConnectionActions integrationId={integration?.id} isConnected={true} />
          ) : undefined
        }
      />

      {integration && (isConnected || isPaused) && (
        <div className="rounded-xl border border-border/50 bg-card p-6 shadow-sm">
          <ZapierConfig
            integrationId={integration.id}
            initialEventMappings={integration.eventMappings}
            enabled={isConnected}
          />
        </div>
      )}

      {!integration && (
        <IntegrationSetupCard
          icon={<ZapierIcon className="h-6 w-6 text-muted-foreground" />}
          title={m.integration_zapier_title()}
          description={m.integration_zapier_description()}
          steps={[
            <p key="1">{m.integration_zapier_setup_step_1()}</p>,
            <p key="2">{m.integration_zapier_setup_step_2()}</p>,
            <p key="3">{m.integration_zapier_setup_step_3()}</p>,
          ]}
          connectionForm={<ZapierConnectionActions integrationId={undefined} isConnected={false} />}
        />
      )}
    </div>
  )
}

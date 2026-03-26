import { createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { adminQueries } from '@/lib/client/queries/admin'
import { IntegrationHeader } from '@/components/admin/settings/integrations/integration-header'
import { IntegrationSetupCard } from '@/components/admin/settings/integrations/integration-setup-card'
import { MakeConnectionActions } from '@/components/admin/settings/integrations/make/make-connection-actions'
import { MakeConfig } from '@/components/admin/settings/integrations/make/make-config'
import { MakeIcon } from '@/components/icons/integration-icons'
import { makeCatalog } from '@/lib/server/integrations/make/catalog'
import * as m from '@/paraglide/messages'

export const Route = createFileRoute('/admin/settings/integrations/make')({
  loader: async ({ context }) => {
    const { queryClient } = context
    await queryClient.ensureQueryData(adminQueries.integrationByType('make'))
    return {}
  },
  component: MakeIntegrationPage,
})

function MakeIntegrationPage() {
  const integrationQuery = useSuspenseQuery(adminQueries.integrationByType('make'))
  const { integration } = integrationQuery.data

  const isConnected = integration?.status === 'active'
  const isPaused = integration?.status === 'paused'

  return (
    <div className="space-y-6">
      <IntegrationHeader
        catalog={makeCatalog}
        status={integration?.status as 'active' | 'paused' | 'pending' | null}
        workspaceName={integration?.workspaceName}
        icon={<MakeIcon className="h-6 w-6 text-white" />}
        actions={
          isConnected || isPaused ? (
            <MakeConnectionActions integrationId={integration?.id} isConnected={true} />
          ) : undefined
        }
      />

      {integration && (isConnected || isPaused) && (
        <div className="rounded-xl border border-border/50 bg-card p-6 shadow-sm">
          <MakeConfig
            integrationId={integration.id}
            initialEventMappings={integration.eventMappings}
            enabled={isConnected}
          />
        </div>
      )}

      {!integration && (
        <IntegrationSetupCard
          icon={<MakeIcon className="h-6 w-6 text-muted-foreground" />}
          title={m.integration_make_title()}
          description={m.integration_make_description()}
          steps={[
            <p key="1">{m.integration_make_setup_step_1()}</p>,
            <p key="2">{m.integration_make_setup_step_2()}</p>,
            <p key="3">{m.integration_make_setup_step_3()}</p>,
          ]}
          connectionForm={<MakeConnectionActions integrationId={undefined} isConnected={false} />}
        />
      )}
    </div>
  )
}

import { createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { adminQueries } from '@/lib/client/queries/admin'
import { IntegrationHeader } from '@/components/admin/settings/integrations/integration-header'
import { IntegrationSetupCard } from '@/components/admin/settings/integrations/integration-setup-card'
import { MondayConnectionActions } from '@/components/admin/settings/integrations/monday/monday-connection-actions'
import { MondayConfig } from '@/components/admin/settings/integrations/monday/monday-config'
import { MondayIcon } from '@/components/icons/integration-icons'
import { mondayCatalog } from '@/lib/server/integrations/monday/catalog'
import * as m from '@/paraglide/messages'

export const Route = createFileRoute('/admin/settings/integrations/monday')({
  loader: async ({ context }) => {
    const { queryClient } = context
    await queryClient.ensureQueryData(adminQueries.integrationByType('monday'))
    return {}
  },
  component: MondayIntegrationPage,
})

function MondayIntegrationPage() {
  const integrationQuery = useSuspenseQuery(adminQueries.integrationByType('monday'))
  const { integration } = integrationQuery.data

  const isConnected = integration?.status === 'active'
  const isPaused = integration?.status === 'paused'

  return (
    <div className="space-y-6">
      <IntegrationHeader
        catalog={mondayCatalog}
        status={integration?.status as 'active' | 'paused' | 'pending' | null}
        workspaceName={integration?.workspaceName}
        icon={<MondayIcon className="h-6 w-6 text-white" />}
        actions={
          isConnected || isPaused ? (
            <MondayConnectionActions integrationId={integration?.id} isConnected={true} />
          ) : undefined
        }
      />

      {integration && (isConnected || isPaused) && (
        <div className="rounded-xl border border-border/50 bg-card p-6 shadow-sm">
          <MondayConfig
            integrationId={integration.id}
            initialConfig={(integration.config ?? {}) as { boardId?: string }}
            initialEventMappings={integration.eventMappings}
            enabled={isConnected}
          />
        </div>
      )}

      {!integration && (
        <IntegrationSetupCard
          icon={<MondayIcon className="h-6 w-6 text-muted-foreground" />}
          title={m.integration_monday_title()}
          description={m.integration_monday_description()}
          steps={[
            <p key="1">{m.integration_monday_setup_step_1()}</p>,
            <p key="2">{m.integration_monday_setup_step_2()}</p>,
            <p key="3">{m.integration_monday_setup_step_3()}</p>,
          ]}
          connectionForm={<MondayConnectionActions integrationId={undefined} isConnected={false} />}
        />
      )}
    </div>
  )
}

import { createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { adminQueries } from '@/lib/client/queries/admin'
import { IntegrationHeader } from '@/components/admin/settings/integrations/integration-header'
import { IntegrationSetupCard } from '@/components/admin/settings/integrations/integration-setup-card'
import { ShortcutConnectionActions } from '@/components/admin/settings/integrations/shortcut/shortcut-connection-actions'
import { ShortcutConfig } from '@/components/admin/settings/integrations/shortcut/shortcut-config'
import { ShortcutIcon } from '@/components/icons/integration-icons'
import { shortcutCatalog } from '@/lib/server/integrations/shortcut/catalog'
import * as m from '@/paraglide/messages'

export const Route = createFileRoute('/admin/settings/integrations/shortcut')({
  loader: async ({ context }) => {
    const { queryClient } = context
    await queryClient.ensureQueryData(adminQueries.integrationByType('shortcut'))
    return {}
  },
  component: ShortcutIntegrationPage,
})

function ShortcutIntegrationPage() {
  const integrationQuery = useSuspenseQuery(adminQueries.integrationByType('shortcut'))
  const { integration } = integrationQuery.data

  const isConnected = integration?.status === 'active'
  const isPaused = integration?.status === 'paused'

  return (
    <div className="space-y-6">
      <IntegrationHeader
        catalog={shortcutCatalog}
        status={integration?.status as 'active' | 'paused' | 'pending' | null}
        workspaceName={integration?.workspaceName}
        icon={<ShortcutIcon className="h-6 w-6 text-white" />}
        actions={
          isConnected || isPaused ? (
            <ShortcutConnectionActions integrationId={integration?.id} isConnected={true} />
          ) : undefined
        }
      />

      {integration && (isConnected || isPaused) && (
        <div className="rounded-xl border border-border/50 bg-card p-6 shadow-sm">
          <ShortcutConfig
            integrationId={integration.id}
            initialConfig={integration.config}
            initialEventMappings={integration.eventMappings}
            enabled={isConnected}
          />
        </div>
      )}

      {!integration && (
        <IntegrationSetupCard
          icon={<ShortcutIcon className="h-6 w-6 text-muted-foreground" />}
          title={m.integration_shortcut_title()}
          description={m.integration_shortcut_description()}
          steps={[
            <p key="1">{m.integration_shortcut_setup_step_1()}</p>,
            <p key="2">{m.integration_shortcut_setup_step_2()}</p>,
            <p key="3">{m.integration_shortcut_setup_step_3()}</p>,
          ]}
          connectionForm={
            <ShortcutConnectionActions integrationId={undefined} isConnected={false} />
          }
        />
      )}
    </div>
  )
}

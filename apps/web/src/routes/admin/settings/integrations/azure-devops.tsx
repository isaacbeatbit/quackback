import { createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { adminQueries } from '@/lib/client/queries/admin'
import { IntegrationHeader } from '@/components/admin/settings/integrations/integration-header'
import { IntegrationSetupCard } from '@/components/admin/settings/integrations/integration-setup-card'
import { AzureDevOpsConnectionActions } from '@/components/admin/settings/integrations/azure-devops/azure-devops-connection-actions'
import { AzureDevOpsConfig } from '@/components/admin/settings/integrations/azure-devops/azure-devops-config'
import { AzureDevOpsIcon } from '@/components/icons/integration-icons'
import { azureDevOpsCatalog } from '@/lib/server/integrations/azure-devops/catalog'
import { integration_azure_devops_description } from '@/paraglide/messages/integration_azure_devops_description.js'
import { integration_azure_devops_pat_link_label } from '@/paraglide/messages/integration_azure_devops_pat_link_label.js'
import { integration_azure_devops_setup_step_1_prefix } from '@/paraglide/messages/integration_azure_devops_setup_step_1_prefix.js'
import { integration_azure_devops_setup_step_1_suffix } from '@/paraglide/messages/integration_azure_devops_setup_step_1_suffix.js'
import { integration_azure_devops_setup_step_2 } from '@/paraglide/messages/integration_azure_devops_setup_step_2.js'
import { integration_azure_devops_setup_step_3 } from '@/paraglide/messages/integration_azure_devops_setup_step_3.js'
import { integration_azure_devops_title } from '@/paraglide/messages/integration_azure_devops_title.js'

export const Route = createFileRoute('/admin/settings/integrations/azure-devops')({
  loader: async ({ context }) => {
    const { queryClient } = context
    await queryClient.ensureQueryData(adminQueries.integrationByType('azure_devops'))
    return {}
  },
  component: AzureDevOpsIntegrationPage,
})

function AzureDevOpsIntegrationPage() {
  const integrationQuery = useSuspenseQuery(adminQueries.integrationByType('azure_devops'))
  const { integration } = integrationQuery.data

  const isConnected = integration?.status === 'active'
  const isPaused = integration?.status === 'paused'

  return (
    <div className="space-y-6">
      <IntegrationHeader
        catalog={azureDevOpsCatalog}
        status={integration?.status as 'active' | 'paused' | 'pending' | null}
        workspaceName={
          (integration?.config as { organizationName?: string })?.organizationName ?? undefined
        }
        icon={<AzureDevOpsIcon className="h-6 w-6" />}
        actions={
          isConnected || isPaused ? (
            <AzureDevOpsConnectionActions integrationId={integration?.id} isConnected={true} />
          ) : undefined
        }
      />

      {integration && (isConnected || isPaused) && (
        <div className="rounded-xl border border-border/50 bg-card p-6 shadow-sm">
          <AzureDevOpsConfig
            integrationId={integration.id}
            initialConfig={integration.config}
            initialEventMappings={integration.eventMappings}
            enabled={isConnected}
          />
        </div>
      )}

      {!integration && (
        <IntegrationSetupCard
          icon={<AzureDevOpsIcon className="h-6 w-6 text-muted-foreground" />}
          title={integration_azure_devops_title()}
          description={integration_azure_devops_description()}
          steps={[
            <p key="1">
              {integration_azure_devops_setup_step_1_prefix()}{' '}
              <a
                href="https://learn.microsoft.com/en-us/azure/devops/organizations/accounts/use-personal-access-tokens-to-authenticate"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary underline underline-offset-2"
              >
                {integration_azure_devops_pat_link_label()}
              </a>{' '}
              {integration_azure_devops_setup_step_1_suffix()}
            </p>,
            <p key="2">{integration_azure_devops_setup_step_2()}</p>,
            <p key="3">{integration_azure_devops_setup_step_3()}</p>,
          ]}
          connectionForm={
            <AzureDevOpsConnectionActions integrationId={undefined} isConnected={false} />
          }
        />
      )}
    </div>
  )
}

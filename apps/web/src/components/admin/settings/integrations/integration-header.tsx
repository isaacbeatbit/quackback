import type { ReactNode } from 'react'
import { BackLink } from '@/components/ui/back-link'
import { Badge } from '@/components/ui/badge'
import { DocsLink } from '@/components/ui/docs-link'
import * as m from '@/paraglide/messages'
import type { IntegrationCatalogEntry } from '@/lib/server/integrations/types'

interface IntegrationHeaderProps {
  catalog: IntegrationCatalogEntry
  status?: 'active' | 'paused' | 'pending' | null
  workspaceName?: string | null
  icon?: ReactNode
  actions?: ReactNode
}

function getLocalizedIntegrationDescription(catalog: IntegrationCatalogEntry) {
  switch (catalog.id) {
    case 'asana':
      return m.integration_asana_description()
    case 'azure_devops':
      return m.integration_azure_devops_description()
    case 'clickup':
      return m.integration_clickup_description()
    case 'discord':
      return m.integration_discord_description()
    case 'freshdesk':
      return m.integration_freshdesk_description()
    case 'github':
      return m.integration_github_description()
    case 'gitlab':
      return m.integration_gitlab_description()
    case 'hubspot':
      return m.integration_hubspot_description()
    case 'intercom':
      return m.integration_intercom_description()
    case 'jira':
      return m.integration_jira_description()
    case 'linear':
      return m.integration_linear_description()
    case 'make':
      return m.integration_make_description()
    case 'monday':
      return m.integration_monday_description()
    case 'n8n':
      return m.integration_n8n_description()
    case 'notion':
      return m.integration_notion_description()
    case 'salesforce':
      return m.integration_salesforce_description()
    case 'shortcut':
      return m.integration_shortcut_description()
    case 'slack':
      return m.integration_slack_description()
    case 'stripe':
      return m.integration_stripe_description()
    case 'teams':
      return m.integration_teams_description()
    case 'trello':
      return m.integration_trello_description()
    case 'zapier':
      return m.integration_zapier_description()
    case 'zendesk':
      return m.integration_zendesk_description()
    default:
      return catalog.description
  }
}

export function IntegrationHeader({
  catalog,
  status,
  workspaceName,
  icon,
  actions,
}: IntegrationHeaderProps) {
  const isConnected = status === 'active'
  const isPaused = status === 'paused'
  const description = getLocalizedIntegrationDescription(catalog)

  return (
    <>
      <BackLink to="/admin/settings/integrations">{m.integrations_back_link()}</BackLink>

      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-xl ${catalog.iconBg}`}
          >
            {icon ?? <span className="text-white font-bold text-lg">{catalog.name.charAt(0)}</span>}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-foreground">{catalog.name}</h1>
              {isConnected && (
                <Badge variant="outline" className="border-green-500/30 text-green-600">
                  {m.integration_status_enabled()}
                </Badge>
              )}
              {isPaused && (
                <Badge variant="outline" className="border-yellow-500/30 text-yellow-600">
                  {m.integration_status_paused()}
                </Badge>
              )}
              {!status && !catalog.available && catalog.configurable && (
                <Badge variant="outline" className="text-muted-foreground/60 border-border/40">
                  {m.integration_status_not_configured()}
                </Badge>
              )}
              {!status && !catalog.available && !catalog.configurable && (
                <Badge variant="outline" className="text-muted-foreground/60 border-border/40">
                  {m.integration_status_coming_soon()}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{description}</p>
            {catalog.docsUrl && (
              <DocsLink href={catalog.docsUrl} className="mt-1 text-xs">
                {m.integration_learn_setup({ provider: catalog.name })}
              </DocsLink>
            )}
            {workspaceName && (
              <p className="mt-1 text-xs text-muted-foreground">
                {m.integration_connected_to()} <span className="font-medium">{workspaceName}</span>
              </p>
            )}
          </div>
        </div>

        {actions}
      </div>
    </>
  )
}

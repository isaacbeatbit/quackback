import { createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { BoltIcon } from '@heroicons/react/24/solid'
import { BackLink } from '@/components/ui/back-link'
import { PageHeader } from '@/components/shared/page-header'
import { adminQueries } from '@/lib/client/queries/admin'
import { SettingsCard } from '@/components/admin/settings/settings-card'
import { WebhooksSettings } from '@/components/admin/settings/webhooks/webhooks-settings'
import { WebhookVerificationGuide } from '@/components/admin/settings/webhooks/webhook-verification-guide'
import * as m from '@/paraglide/messages'

export const Route = createFileRoute('/admin/settings/webhooks')({
  loader: async ({ context }) => {
    const { requireWorkspaceRole } = await import('@/lib/server/functions/workspace-utils')
    await requireWorkspaceRole({ data: { allowedRoles: ['admin'] } })

    const { queryClient } = context
    await queryClient.ensureQueryData(adminQueries.webhooks())

    return {}
  },
  component: WebhooksPage,
})

function WebhooksPage() {
  const webhooksQuery = useSuspenseQuery(adminQueries.webhooks())

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="lg:hidden">
        <BackLink to="/admin/settings">{m.nav_settings()}</BackLink>
      </div>
      <PageHeader
        icon={BoltIcon}
        title={m.settings_webhooks_page_title()}
        description={m.settings_webhooks_page_description()}
      />

      <SettingsCard
        title={m.settings_webhooks_configured_title()}
        description={m.settings_webhooks_configured_description()}
      >
        <WebhooksSettings webhooks={webhooksQuery.data} />
      </SettingsCard>

      <WebhookVerificationGuide />
    </div>
  )
}

'use client'

import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import * as m from '@/paraglide/messages'
import { useUpdateIntegration } from '@/lib/client/mutations'
import { getIntegrationDisplayName } from '@/lib/shared/integrations'

interface OnDeleteConfigProps {
  integrationId: string
  integrationType: string
  config: Record<string, unknown>
  enabled: boolean
}

export function OnDeleteConfig({
  integrationId,
  integrationType,
  config,
  enabled,
}: OnDeleteConfigProps) {
  const updateMutation = useUpdateIntegration()
  const onDeleteAction = (config.onDeleteAction as string) ?? 'nothing'
  const isChecked = onDeleteAction === 'archive'
  const saving = updateMutation.isPending

  const name = getIntegrationDisplayName(integrationType)
  const action = isChecked ? m.delete_post_action_archive() : m.delete_post_action_close()

  const handleToggle = (checked: boolean) => {
    updateMutation.mutate({
      id: integrationId,
      config: { onDeleteAction: checked ? 'archive' : 'nothing' },
    })
  }

  return (
    <div className="space-y-2 border-t border-border/50 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <Label htmlFor="on-delete-toggle" className="text-base font-medium">
            {m.integration_on_delete_title()}
          </Label>
          <p className="text-sm text-muted-foreground">
            {m.integration_on_delete_description({ action })}
          </p>
        </div>
        <Switch
          id="on-delete-toggle"
          checked={isChecked}
          onCheckedChange={handleToggle}
          disabled={saving || !enabled}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {m.integration_on_delete_help({ action: action.toLowerCase(), name })}
      </p>
    </div>
  )
}

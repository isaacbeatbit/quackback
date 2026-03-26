import { useState, useEffect, useCallback } from 'react'
import { ArrowPathIcon } from '@heroicons/react/24/solid'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import * as m from '@/paraglide/messages'
import { useUpdateIntegration } from '@/lib/client/mutations'
import { OnDeleteConfig } from '@/components/admin/settings/integrations/on-delete-config'
import {
  fetchNotionDatabasesFn,
  type NotionDatabase,
} from '@/lib/server/integrations/notion/functions'

interface EventMapping {
  id: string
  eventType: string
  enabled: boolean
}

interface NotionConfigProps {
  integrationId: string
  initialConfig: { channelId?: string }
  initialEventMappings: EventMapping[]
  enabled: boolean
}

const EVENT_CONFIG = [
  {
    id: 'post.created' as const,
    label: m.integration_notion_event_post_created_label(),
    description: m.integration_notion_event_post_created_description(),
  },
]

export function NotionConfig({
  integrationId,
  initialConfig,
  initialEventMappings,
  enabled,
}: NotionConfigProps) {
  const updateMutation = useUpdateIntegration()
  const [databases, setDatabases] = useState<NotionDatabase[]>([])
  const [loadingDatabases, setLoadingDatabases] = useState(false)
  const [databaseError, setDatabaseError] = useState<string | null>(null)
  const [selectedDatabase, setSelectedDatabase] = useState(initialConfig.channelId || '')
  const [integrationEnabled, setIntegrationEnabled] = useState(enabled)
  const [eventSettings, setEventSettings] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      EVENT_CONFIG.map((event) => [
        event.id,
        initialEventMappings.find((m) => m.eventType === event.id)?.enabled ?? false,
      ])
    )
  )

  const fetchDatabases = useCallback(async () => {
    setLoadingDatabases(true)
    setDatabaseError(null)
    try {
      const result = await fetchNotionDatabasesFn()
      setDatabases(result)
    } catch {
      setDatabaseError(m.integration_notion_load_databases_failed())
    } finally {
      setLoadingDatabases(false)
    }
  }, [])

  useEffect(() => {
    fetchDatabases()
  }, [fetchDatabases])

  const handleEnabledChange = (checked: boolean) => {
    setIntegrationEnabled(checked)
    updateMutation.mutate({ id: integrationId, enabled: checked })
  }

  const handleDatabaseChange = (databaseId: string) => {
    setSelectedDatabase(databaseId)
    updateMutation.mutate({ id: integrationId, config: { channelId: databaseId } })
  }

  const handleEventToggle = (eventId: string, checked: boolean) => {
    const newSettings = { ...eventSettings, [eventId]: checked }
    setEventSettings(newSettings)
    updateMutation.mutate({
      id: integrationId,
      eventMappings: Object.entries(newSettings).map(([eventType, enabled]) => ({
        eventType,
        enabled,
      })),
    })
  }

  const saving = updateMutation.isPending

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Label htmlFor="enabled-toggle" className="text-base font-medium">
            {m.integration_notion_enabled_label()}
          </Label>
          <p className="text-sm text-muted-foreground">
            {m.integration_notion_enabled_description()}
          </p>
        </div>
        <Switch
          id="enabled-toggle"
          checked={integrationEnabled}
          onCheckedChange={handleEnabledChange}
          disabled={saving}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="database-select">{m.integration_notion_database_label()}</Label>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchDatabases}
            disabled={loadingDatabases}
            className="h-8 gap-1.5 text-xs"
          >
            <ArrowPathIcon className={`h-3.5 w-3.5 ${loadingDatabases ? 'animate-spin' : ''}`} />
            {m.common_refresh()}
          </Button>
        </div>
        {databaseError ? (
          <p className="text-sm text-destructive">{databaseError}</p>
        ) : (
          <Select
            value={selectedDatabase}
            onValueChange={handleDatabaseChange}
            disabled={loadingDatabases || saving || !integrationEnabled}
          >
            <SelectTrigger id="database-select" className="w-full">
              {loadingDatabases ? (
                <div className="flex items-center gap-2">
                  <ArrowPathIcon className="h-4 w-4 animate-spin" />
                  <span>{m.integration_notion_loading_databases()}</span>
                </div>
              ) : (
                <SelectValue placeholder={m.integration_select_database_placeholder()} />
              )}
            </SelectTrigger>
            <SelectContent>
              {databases.map((database) => (
                <SelectItem key={database.id} value={database.id}>
                  {database.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <p className="text-xs text-muted-foreground">{m.integration_notion_database_help()}</p>
      </div>

      <div className="space-y-3">
        <Label className="text-base font-medium">{m.common_events()}</Label>
        <p className="text-sm text-muted-foreground">{m.integration_notion_events_help()}</p>
        <div className="space-y-3 pt-2">
          {EVENT_CONFIG.map((event) => (
            <div
              key={event.id}
              className="flex items-center justify-between rounded-lg border border-border/50 p-3"
            >
              <div>
                <div className="font-medium text-sm">{event.label}</div>
                <div className="text-xs text-muted-foreground">{event.description}</div>
              </div>
              <Switch
                checked={eventSettings[event.id] ?? false}
                onCheckedChange={(checked) => handleEventToggle(event.id, checked)}
                disabled={saving || !integrationEnabled}
              />
            </div>
          ))}
        </div>
      </div>

      {saving && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ArrowPathIcon className="h-4 w-4 animate-spin" />
          <span>{m.common_saving()}</span>
        </div>
      )}

      {updateMutation.isError && (
        <div className="text-sm text-destructive">
          {updateMutation.error?.message || m.common_failed_save_changes()}
        </div>
      )}

      <OnDeleteConfig
        integrationId={integrationId}
        integrationType="notion"
        config={initialConfig}
        enabled={integrationEnabled}
      />
    </div>
  )
}

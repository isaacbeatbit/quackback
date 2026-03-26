'use client'

import { useState, useEffect, useCallback } from 'react'
import { ArrowPathIcon, FolderIcon } from '@heroicons/react/24/solid'
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
import { useUpdateIntegration } from '@/lib/client/mutations'
import { fetchExternalStatusesFn } from '@/lib/server/functions/external-statuses'
import * as m from '@/paraglide/messages'
import {
  StatusSyncConfig,
  type ExternalStatus,
} from '@/components/admin/settings/integrations/status-sync-config'
import { OnDeleteConfig } from '@/components/admin/settings/integrations/on-delete-config'
import {
  fetchClickUpSpacesFn,
  fetchClickUpListsFn,
  type ClickUpSpace,
  type ClickUpList,
} from '@/lib/server/integrations/clickup/functions'

interface EventMapping {
  id: string
  eventType: string
  enabled: boolean
}

interface ClickUpConfigProps {
  integrationId: string
  initialConfig: Record<string, unknown>
  initialEventMappings: EventMapping[]
  enabled: boolean
}

const EVENT_IDS = ['post.created', 'post.status_changed'] as const

export function ClickUpConfig({
  integrationId,
  initialConfig,
  initialEventMappings,
  enabled,
}: ClickUpConfigProps) {
  const updateMutation = useUpdateIntegration()

  const [spaces, setSpaces] = useState<ClickUpSpace[]>([])
  const [loadingSpaces, setLoadingSpaces] = useState(false)
  const [spaceError, setSpaceError] = useState<string | null>(null)
  const [selectedSpace, setSelectedSpace] = useState((initialConfig.teamId as string) || '')

  const [lists, setLists] = useState<ClickUpList[]>([])
  const [loadingLists, setLoadingLists] = useState(false)
  const [listError, setListError] = useState<string | null>(null)
  const [selectedList, setSelectedList] = useState((initialConfig.channelId as string) || '')

  const [externalStatuses, setExternalStatuses] = useState<ExternalStatus[]>([])
  const [integrationEnabled, setIntegrationEnabled] = useState(enabled)
  const [eventSettings, setEventSettings] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      EVENT_IDS.map((eventId) => [
        eventId,
        initialEventMappings.find((mapping) => mapping.eventType === eventId)?.enabled ?? false,
      ])
    )
  )

  const fetchSpaces = useCallback(async () => {
    setLoadingSpaces(true)
    setSpaceError(null)
    try {
      const result = await fetchClickUpSpacesFn()
      setSpaces(result)
    } catch {
      setSpaceError(m.integration_clickup_load_spaces_failed())
    } finally {
      setLoadingSpaces(false)
    }
  }, [])

  const fetchLists = useCallback(async (spaceId: string) => {
    setLoadingLists(true)
    setListError(null)
    try {
      const result = await fetchClickUpListsFn({ data: { spaceId } })
      setLists(result)
    } catch {
      setListError(m.integration_clickup_load_lists_failed())
    } finally {
      setLoadingLists(false)
    }
  }, [])

  useEffect(() => {
    fetchSpaces()
    fetchExternalStatusesFn({ data: { integrationType: 'clickup' } })
      .then(setExternalStatuses)
      .catch(() => {})
  }, [fetchSpaces])

  useEffect(() => {
    if (selectedSpace) {
      fetchLists(selectedSpace)
    }
  }, [selectedSpace, fetchLists])

  const handleEnabledChange = (checked: boolean) => {
    setIntegrationEnabled(checked)
    updateMutation.mutate({ id: integrationId, enabled: checked })
  }

  const handleSpaceChange = (spaceId: string) => {
    setSelectedSpace(spaceId)
    setSelectedList('')
    setLists([])
    updateMutation.mutate({ id: integrationId, config: { teamId: spaceId, channelId: '' } })
  }

  const handleListChange = (listId: string) => {
    setSelectedList(listId)
    updateMutation.mutate({
      id: integrationId,
      config: { teamId: selectedSpace, channelId: listId },
    })
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
  const eventConfig = [
    {
      id: 'post.created' as const,
      label: m.integration_clickup_event_create_label(),
      description: m.integration_clickup_event_create_description(),
    },
    {
      id: 'post.status_changed' as const,
      label: m.integration_clickup_event_status_label(),
      description: m.integration_clickup_event_status_description(),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Label htmlFor="enabled-toggle" className="text-base font-medium">
            {m.integration_clickup_enabled_label()}
          </Label>
          <p className="text-sm text-muted-foreground">
            {m.integration_clickup_enabled_description()}
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
          <Label htmlFor="space-select">{m.common_space()}</Label>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchSpaces}
            disabled={loadingSpaces}
            className="h-8 gap-1.5 text-xs"
          >
            <ArrowPathIcon className={`h-3.5 w-3.5 ${loadingSpaces ? 'animate-spin' : ''}`} />
            {m.common_refresh()}
          </Button>
        </div>
        {spaceError ? (
          <p className="text-sm text-destructive">{spaceError}</p>
        ) : (
          <Select
            value={selectedSpace}
            onValueChange={handleSpaceChange}
            disabled={loadingSpaces || saving || !integrationEnabled}
          >
            <SelectTrigger id="space-select" className="w-full">
              {loadingSpaces ? (
                <div className="flex items-center gap-2">
                  <ArrowPathIcon className="h-4 w-4 animate-spin" />
                  <span>{m.integration_clickup_loading_spaces()}</span>
                </div>
              ) : (
                <SelectValue placeholder={m.integration_select_space_placeholder()} />
              )}
            </SelectTrigger>
            <SelectContent>
              {spaces.map((space) => (
                <SelectItem key={space.id} value={space.id}>
                  <div className="flex items-center gap-2">
                    <FolderIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{space.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <p className="text-xs text-muted-foreground">{m.integration_clickup_space_help()}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="list-select">{m.common_list()}</Label>
        {listError ? (
          <p className="text-sm text-destructive">{listError}</p>
        ) : (
          <Select
            value={selectedList}
            onValueChange={handleListChange}
            disabled={!selectedSpace || loadingLists || saving || !integrationEnabled}
          >
            <SelectTrigger id="list-select" className="w-full">
              {loadingLists ? (
                <div className="flex items-center gap-2">
                  <ArrowPathIcon className="h-4 w-4 animate-spin" />
                  <span>{m.integration_clickup_loading_lists()}</span>
                </div>
              ) : (
                <SelectValue
                  placeholder={
                    selectedSpace
                      ? m.integration_clickup_select_list_placeholder()
                      : m.integration_clickup_select_space_first()
                  }
                />
              )}
            </SelectTrigger>
            <SelectContent>
              {lists.map((list) => (
                <SelectItem key={list.id} value={list.id}>
                  {list.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <p className="text-xs text-muted-foreground">{m.integration_clickup_list_help()}</p>
      </div>

      <div className="space-y-3">
        <Label className="text-base font-medium">{m.common_events()}</Label>
        <p className="text-sm text-muted-foreground">{m.integration_clickup_events_help()}</p>
        <div className="space-y-3 pt-2">
          {eventConfig.map((event) => (
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

      <StatusSyncConfig
        integrationId={integrationId}
        integrationType="clickup"
        config={initialConfig}
        enabled={integrationEnabled}
        externalStatuses={externalStatuses}
      />

      <OnDeleteConfig
        integrationId={integrationId}
        integrationType="clickup"
        config={initialConfig}
        enabled={integrationEnabled}
      />
    </div>
  )
}

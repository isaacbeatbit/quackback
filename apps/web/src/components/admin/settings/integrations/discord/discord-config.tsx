import { useState, useEffect, useCallback } from 'react'
import { ArrowPathIcon, HashtagIcon } from '@heroicons/react/24/solid'
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
import {
  fetchDiscordChannelsFn,
  type DiscordChannel,
} from '@/lib/server/integrations/discord/functions'
import * as m from '@/paraglide/messages'

interface EventMapping {
  id: string
  eventType: string
  enabled: boolean
}

interface DiscordConfigProps {
  integrationId: string
  initialConfig: { channelId?: string }
  initialEventMappings: EventMapping[]
  enabled: boolean
}

const EVENT_IDS = ['post.created', 'post.status_changed', 'comment.created'] as const

export function DiscordConfig({
  integrationId,
  initialConfig,
  initialEventMappings,
  enabled,
}: DiscordConfigProps) {
  const updateMutation = useUpdateIntegration()
  const [channels, setChannels] = useState<DiscordChannel[]>([])
  const [loadingChannels, setLoadingChannels] = useState(false)
  const [channelError, setChannelError] = useState<string | null>(null)
  const [selectedChannel, setSelectedChannel] = useState(initialConfig.channelId || '')
  const [integrationEnabled, setIntegrationEnabled] = useState(enabled)
  const [eventSettings, setEventSettings] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      EVENT_IDS.map((eventId) => [
        eventId,
        initialEventMappings.find((mapping) => mapping.eventType === eventId)?.enabled ?? false,
      ])
    )
  )

  const fetchChannels = useCallback(async () => {
    setLoadingChannels(true)
    setChannelError(null)
    try {
      const result = await fetchDiscordChannelsFn()
      setChannels(result)
    } catch {
      setChannelError(m.integration_discord_load_channels_failed())
    } finally {
      setLoadingChannels(false)
    }
  }, [])

  useEffect(() => {
    fetchChannels()
  }, [fetchChannels])

  const handleEnabledChange = (checked: boolean) => {
    setIntegrationEnabled(checked)
    updateMutation.mutate({ id: integrationId, enabled: checked })
  }

  const handleChannelChange = (channelId: string) => {
    setSelectedChannel(channelId)
    updateMutation.mutate({ id: integrationId, config: { channelId } })
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
      label: m.integration_discord_event_post_created_label(),
      description: m.integration_discord_event_post_created_description(),
    },
    {
      id: 'post.status_changed' as const,
      label: m.integration_discord_event_status_changed_label(),
      description: m.integration_discord_event_status_changed_description(),
    },
    {
      id: 'comment.created' as const,
      label: m.integration_discord_event_comment_created_label(),
      description: m.integration_discord_event_comment_created_description(),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Label htmlFor="enabled-toggle" className="text-base font-medium">
            {m.integration_discord_enabled_label()}
          </Label>
          <p className="text-sm text-muted-foreground">
            {m.integration_discord_enabled_description()}
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
          <Label htmlFor="channel-select">{m.integration_discord_channel_label()}</Label>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchChannels}
            disabled={loadingChannels}
            className="h-8 gap-1.5 text-xs"
          >
            <ArrowPathIcon className={`h-3.5 w-3.5 ${loadingChannels ? 'animate-spin' : ''}`} />
            {m.common_refresh()}
          </Button>
        </div>
        {channelError ? (
          <p className="text-sm text-destructive">{channelError}</p>
        ) : (
          <Select
            value={selectedChannel}
            onValueChange={handleChannelChange}
            disabled={loadingChannels || saving || !integrationEnabled}
          >
            <SelectTrigger id="channel-select" className="w-full">
              {loadingChannels ? (
                <div className="flex items-center gap-2">
                  <ArrowPathIcon className="h-4 w-4 animate-spin" />
                  <span>{m.integration_discord_loading_channels()}</span>
                </div>
              ) : (
                <SelectValue placeholder={m.integration_select_channel_placeholder()} />
              )}
            </SelectTrigger>
            <SelectContent>
              {channels.map((channel) => (
                <SelectItem key={channel.id} value={channel.id}>
                  <div className="flex items-center gap-2">
                    <HashtagIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{channel.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <p className="text-xs text-muted-foreground">{m.integration_discord_channel_help()}</p>
      </div>

      <div className="space-y-3">
        <Label className="text-base font-medium">{m.common_events()}</Label>
        <p className="text-sm text-muted-foreground">{m.integration_discord_events_help()}</p>
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
    </div>
  )
}

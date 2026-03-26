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
  fetchAzureDevOpsProjectsFn,
  fetchAzureDevOpsWorkItemTypesFn,
} from '@/lib/server/integrations/azure-devops/functions'
import type {
  AzureDevOpsProject,
  AzureDevOpsWorkItemType,
} from '@/lib/server/integrations/azure-devops/api'

interface EventMapping {
  id: string
  eventType: string
  enabled: boolean
}

interface AzureDevOpsConfigProps {
  integrationId: string
  initialConfig: Record<string, unknown>
  initialEventMappings: EventMapping[]
  enabled: boolean
}

const EVENT_CONFIG = [
  {
    id: 'post.created' as const,
    label: m.integration_azure_devops_event_create_label(),
    description: m.integration_azure_devops_event_create_description(),
  },
]

function parseChannelId(channelId?: string): { projectName: string; workItemType: string } {
  if (!channelId || !channelId.includes(':')) {
    return { projectName: '', workItemType: '' }
  }
  const [projectName, workItemType] = channelId.split(':')
  return { projectName, workItemType }
}

export function AzureDevOpsConfig({
  integrationId,
  initialConfig,
  initialEventMappings,
  enabled,
}: AzureDevOpsConfigProps) {
  const updateMutation = useUpdateIntegration()

  const { projectName: initialProjectName, workItemType: initialWorkItemType } = parseChannelId(
    (initialConfig.channelId as string) || ''
  )

  const [projects, setProjects] = useState<AzureDevOpsProject[]>([])
  const [loadingProjects, setLoadingProjects] = useState(false)
  const [projectError, setProjectError] = useState<string | null>(null)
  const [selectedProject, setSelectedProject] = useState(initialProjectName)

  const [workItemTypes, setWorkItemTypes] = useState<AzureDevOpsWorkItemType[]>([])
  const [loadingWorkItemTypes, setLoadingWorkItemTypes] = useState(false)
  const [workItemTypeError, setWorkItemTypeError] = useState<string | null>(null)
  const [selectedWorkItemType, setSelectedWorkItemType] = useState(initialWorkItemType)

  const [externalStatuses, setExternalStatuses] = useState<ExternalStatus[]>([])
  const [integrationEnabled, setIntegrationEnabled] = useState(enabled)
  const [eventSettings, setEventSettings] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      EVENT_CONFIG.map((event) => [
        event.id,
        initialEventMappings.find((m) => m.eventType === event.id)?.enabled ?? false,
      ])
    )
  )

  const fetchProjects = useCallback(async () => {
    setLoadingProjects(true)
    setProjectError(null)
    try {
      const result = await fetchAzureDevOpsProjectsFn()
      setProjects(result)
    } catch {
      setProjectError(m.integration_azure_devops_load_projects_failed())
    } finally {
      setLoadingProjects(false)
    }
  }, [])

  const fetchWorkItemTypes = useCallback(async (project: string) => {
    setLoadingWorkItemTypes(true)
    setWorkItemTypeError(null)
    try {
      const result = await fetchAzureDevOpsWorkItemTypesFn({ data: { project } })
      setWorkItemTypes(result)
    } catch {
      setWorkItemTypeError(m.integration_azure_devops_load_work_item_types_failed())
    } finally {
      setLoadingWorkItemTypes(false)
    }
  }, [])

  useEffect(() => {
    fetchProjects()
    fetchExternalStatusesFn({ data: { integrationType: 'azure_devops' } })
      .then(setExternalStatuses)
      .catch(() => {})
  }, [fetchProjects])

  useEffect(() => {
    if (selectedProject) {
      fetchWorkItemTypes(selectedProject)
    }
  }, [selectedProject, fetchWorkItemTypes])

  const handleEnabledChange = (checked: boolean) => {
    setIntegrationEnabled(checked)
    updateMutation.mutate({ id: integrationId, enabled: checked })
  }

  const handleProjectChange = (projectName: string) => {
    setSelectedProject(projectName)
    setSelectedWorkItemType('')
    setWorkItemTypes([])
  }

  const handleWorkItemTypeChange = (workItemType: string) => {
    setSelectedWorkItemType(workItemType)
    const channelId = `${selectedProject}:${workItemType}`
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Label htmlFor="enabled-toggle" className="text-base font-medium">
            {m.integration_azure_devops_enabled_label()}
          </Label>
          <p className="text-sm text-muted-foreground">
            {m.integration_azure_devops_enabled_description()}
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
          <Label htmlFor="project-select">{m.common_project()}</Label>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchProjects}
            disabled={loadingProjects}
            className="h-8 gap-1.5 text-xs"
          >
            <ArrowPathIcon className={`h-3.5 w-3.5 ${loadingProjects ? 'animate-spin' : ''}`} />
            {m.common_refresh()}
          </Button>
        </div>
        {projectError ? (
          <p className="text-sm text-destructive">{projectError}</p>
        ) : (
          <Select
            value={selectedProject}
            onValueChange={handleProjectChange}
            disabled={loadingProjects || saving || !integrationEnabled}
          >
            <SelectTrigger id="project-select" className="w-full">
              {loadingProjects ? (
                <div className="flex items-center gap-2">
                  <ArrowPathIcon className="h-4 w-4 animate-spin" />
                  <span>{m.integration_azure_devops_loading_projects()}</span>
                </div>
              ) : (
                <SelectValue placeholder={m.integration_select_project_placeholder()} />
              )}
            </SelectTrigger>
            <SelectContent>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.name}>
                  <div className="flex items-center gap-2">
                    <FolderIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{project.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <p className="text-xs text-muted-foreground">{m.integration_azure_devops_project_help()}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="work-item-type-select">
          {m.integration_azure_devops_work_item_type_label()}
        </Label>
        {workItemTypeError ? (
          <p className="text-sm text-destructive">{workItemTypeError}</p>
        ) : (
          <Select
            value={selectedWorkItemType}
            onValueChange={handleWorkItemTypeChange}
            disabled={!selectedProject || loadingWorkItemTypes || saving || !integrationEnabled}
          >
            <SelectTrigger id="work-item-type-select" className="w-full">
              {loadingWorkItemTypes ? (
                <div className="flex items-center gap-2">
                  <ArrowPathIcon className="h-4 w-4 animate-spin" />
                  <span>{m.integration_azure_devops_loading_work_item_types()}</span>
                </div>
              ) : (
                <SelectValue
                  placeholder={
                    selectedProject
                      ? m.integration_azure_devops_select_work_item_type_placeholder()
                      : m.integration_azure_devops_select_project_first()
                  }
                />
              )}
            </SelectTrigger>
            <SelectContent>
              {workItemTypes.map((type) => (
                <SelectItem key={type.name} value={type.name}>
                  {type.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <p className="text-xs text-muted-foreground">
          {m.integration_azure_devops_work_item_type_help()}
        </p>
      </div>

      <div className="space-y-3">
        <Label className="text-base font-medium">{m.common_events()}</Label>
        <p className="text-sm text-muted-foreground">{m.integration_azure_devops_events_help()}</p>
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

      <StatusSyncConfig
        integrationId={integrationId}
        integrationType="azure_devops"
        config={initialConfig}
        enabled={integrationEnabled}
        externalStatuses={externalStatuses}
        isManual={true}
      />

      <OnDeleteConfig
        integrationId={integrationId}
        integrationType="azure_devops"
        config={initialConfig}
        enabled={integrationEnabled}
      />
    </div>
  )
}

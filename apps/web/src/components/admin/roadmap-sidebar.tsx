import { useState } from 'react'
import {
  PlusIcon,
  MapIcon,
  EllipsisVerticalIcon,
  PencilIcon,
  TrashIcon,
  ArrowPathIcon,
  LockClosedIcon,
} from '@heroicons/react/24/solid'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { EmptyState } from '@/components/shared/empty-state'
import { cn } from '@/lib/shared/utils'
import { useRoadmaps } from '@/lib/client/hooks/use-roadmaps-query'
import { useCreateRoadmap, useUpdateRoadmap, useDeleteRoadmap } from '@/lib/client/mutations'
import type { Roadmap } from '@/lib/shared/db-types'
import * as m from '@/paraglide/messages'

interface RoadmapSidebarProps {
  selectedRoadmapId: string | null
  onSelectRoadmap: (roadmapId: string | null) => void
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function RoadmapSidebar({ selectedRoadmapId, onSelectRoadmap }: RoadmapSidebarProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [editingRoadmap, setEditingRoadmap] = useState<Roadmap | null>(null)
  const [deletingRoadmap, setDeletingRoadmap] = useState<Roadmap | null>(null)

  const { data: roadmaps, isLoading } = useRoadmaps()
  const createRoadmap = useCreateRoadmap()
  const updateRoadmap = useUpdateRoadmap()
  const deleteRoadmap = useDeleteRoadmap()

  const handleCreateSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const name = formData.get('name') as string
    const description = formData.get('description') as string
    const isPublic = formData.get('isPublic') === 'on'

    try {
      const newRoadmap = await createRoadmap.mutateAsync({
        name,
        slug: slugify(name),
        description: description || undefined,
        isPublic,
      })
      setIsCreateDialogOpen(false)
      onSelectRoadmap(newRoadmap.id)
    } catch (error) {
      console.error('Failed to create roadmap:', error)
    }
  }

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingRoadmap) return

    const formData = new FormData(e.currentTarget)
    const name = formData.get('name') as string
    const description = formData.get('description') as string
    const isPublic = formData.get('isPublic') === 'on'

    try {
      await updateRoadmap.mutateAsync({
        roadmapId: editingRoadmap.id,
        input: {
          name,
          description,
          isPublic,
        },
      })
      setIsEditDialogOpen(false)
      setEditingRoadmap(null)
    } catch (error) {
      console.error('Failed to update roadmap:', error)
    }
  }

  const handleDelete = async () => {
    if (!deletingRoadmap) return

    try {
      await deleteRoadmap.mutateAsync(deletingRoadmap.id)
      setIsDeleteDialogOpen(false)
      setDeletingRoadmap(null)
      if (selectedRoadmapId === deletingRoadmap.id) {
        onSelectRoadmap(roadmaps?.[0]?.id ?? null)
      }
    } catch (error) {
      console.error('Failed to delete roadmap:', error)
    }
  }

  const openEditDialog = (roadmap: Roadmap) => {
    setEditingRoadmap(roadmap)
    setIsEditDialogOpen(true)
  }

  const openDeleteDialog = (roadmap: Roadmap) => {
    setDeletingRoadmap(roadmap)
    setIsDeleteDialogOpen(true)
  }

  return (
    <aside className="w-64 xl:w-72 shrink-0 flex flex-col border-r border-border/50 bg-card/30 overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center justify-between py-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {m.nav_roadmap()}
          </span>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 -mr-2">
                <PlusIcon className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>{m.roadmaps_create_title()}</DialogTitle>
                <DialogDescription>{m.roadmaps_create_description()}</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">{m.api_keys_name_label()}</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder={m.roadmaps_name_placeholder()}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">{m.roadmaps_description_label()}</Label>
                  <Input
                    id="description"
                    name="description"
                    placeholder={m.roadmaps_description_placeholder()}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="isPublic" name="isPublic" defaultChecked />
                  <Label htmlFor="isPublic">{m.roadmaps_public_label()}</Label>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    {m.common_cancel()}
                  </Button>
                  <Button type="submit" disabled={createRoadmap.isPending}>
                    {createRoadmap.isPending && (
                      <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    {m.roadmaps_create_button()}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* List */}
      <ScrollArea className="flex-1">
        <div className="px-5 pb-5">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <ArrowPathIcon className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : roadmaps?.length === 0 ? (
            <EmptyState
              icon={MapIcon}
              title={m.roadmaps_empty_title()}
              description={m.roadmaps_empty_description()}
              className="py-12"
            />
          ) : (
            <div className="space-y-1">
              {roadmaps?.map((roadmap) => (
                <div
                  key={roadmap.id}
                  className={cn(
                    'group flex items-center gap-2 px-2.5 py-1.5 rounded-md cursor-pointer font-medium transition-colors',
                    selectedRoadmapId === roadmap.id
                      ? 'bg-muted text-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  )}
                  onClick={() => onSelectRoadmap(roadmap.id)}
                >
                  <MapIcon
                    className={cn(
                      'h-3.5 w-3.5 shrink-0',
                      selectedRoadmapId === roadmap.id ? 'text-primary' : ''
                    )}
                  />
                  <span className="flex-1 text-xs truncate">{roadmap.name}</span>
                  {!roadmap.isPublic && (
                    <LockClosedIcon className="h-3 w-3 text-muted-foreground/60 shrink-0" />
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 -mr-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <EllipsisVerticalIcon className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEditDialog(roadmap)}>
                        <PencilIcon className="h-4 w-4 mr-2" />
                        {m.common_edit()}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => openDeleteDialog(roadmap)}
                      >
                        <TrashIcon className="h-4 w-4 mr-2" />
                        {m.common_delete()}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{m.roadmaps_edit_title()}</DialogTitle>
            <DialogDescription>{m.roadmaps_edit_description()}</DialogDescription>
          </DialogHeader>
          {editingRoadmap && (
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">{m.api_keys_name_label()}</Label>
                <Input id="edit-name" name="name" defaultValue={editingRoadmap.name} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">{m.roadmaps_description_label()}</Label>
                <Input
                  id="edit-description"
                  name="description"
                  defaultValue={editingRoadmap.description || ''}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-isPublic"
                  name="isPublic"
                  defaultChecked={editingRoadmap.isPublic}
                />
                <Label htmlFor="edit-isPublic">{m.roadmaps_public_label()}</Label>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  {m.common_cancel()}
                </Button>
                <Button type="submit" disabled={updateRoadmap.isPending}>
                  {updateRoadmap.isPending && (
                    <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  {m.common_save_changes()}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title={m.roadmaps_delete_title()}
        description={m.roadmaps_delete_description({ name: deletingRoadmap?.name ?? '' })}
        confirmLabel={m.common_delete()}
        variant="destructive"
        isPending={deleteRoadmap.isPending}
        onConfirm={handleDelete}
      />
    </aside>
  )
}

'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  EllipsisVerticalIcon,
  ShieldCheckIcon,
  UserIcon,
  UserMinusIcon,
} from '@heroicons/react/24/solid'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { updateMemberRoleFn, removeTeamMemberFn } from '@/lib/server/functions/admin'
import * as m from '@/paraglide/messages'

interface MemberActionsProps {
  principalId: string
  memberName: string
  memberRole: 'admin' | 'member'
  isLastAdmin: boolean
}

export function MemberActions({
  principalId,
  memberName,
  memberRole,
  isLastAdmin,
}: MemberActionsProps) {
  const queryClient = useQueryClient()
  const [isLoading, setIsLoading] = useState(false)
  const [roleDialogOpen, setRoleDialogOpen] = useState(false)
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false)

  const newRole = memberRole === 'admin' ? 'member' : 'admin'
  const canChangeRole = !(memberRole === 'admin' && isLastAdmin)
  const canRemove = !(memberRole === 'admin' && isLastAdmin)

  const handleRoleChange = async () => {
    setIsLoading(true)
    try {
      await updateMemberRoleFn({ data: { principalId, role: newRole } })
      await queryClient.invalidateQueries({ queryKey: ['settings', 'team'] })
    } catch (error) {
      console.error('Failed to update role:', error)
      alert(error instanceof Error ? error.message : 'Failed to update role')
    } finally {
      setIsLoading(false)
      setRoleDialogOpen(false)
    }
  }

  const handleRemove = async () => {
    setIsLoading(true)
    try {
      await removeTeamMemberFn({ data: { principalId } })
      await queryClient.invalidateQueries({ queryKey: ['settings', 'team'] })
    } catch (error) {
      console.error('Failed to remove member:', error)
      alert(error instanceof Error ? error.message : 'Failed to remove team member')
    } finally {
      setIsLoading(false)
      setRemoveDialogOpen(false)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <EllipsisVerticalIcon className="h-4 w-4" />
            <span className="sr-only">{m.team_member_actions_sr()}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => setRoleDialogOpen(true)}
            disabled={!canChangeRole}
            className="gap-2"
          >
            {newRole === 'admin' ? (
              <>
                <ShieldCheckIcon className="h-4 w-4" />
                {m.team_make_admin()}
              </>
            ) : (
              <>
                <UserIcon className="h-4 w-4" />
                {m.team_make_member()}
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setRemoveDialogOpen(true)}
            disabled={!canRemove}
            variant="destructive"
            className="gap-2"
          >
            <UserMinusIcon className="h-4 w-4" />
            {m.team_remove_from_team()}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={roleDialogOpen}
        onOpenChange={setRoleDialogOpen}
        title={newRole === 'admin' ? m.team_make_admin_title() : m.team_remove_admin_title()}
        description={
          newRole === 'admin' ? (
            <>
              <strong>{memberName}</strong> {m.team_make_admin_description_suffix()}
            </>
          ) : (
            <>
              <strong>{memberName}</strong> {m.team_remove_admin_description_suffix()}
            </>
          )
        }
        confirmLabel={
          isLoading
            ? m.team_updating()
            : newRole === 'admin'
              ? m.team_make_admin()
              : m.team_remove_admin()
        }
        isPending={isLoading}
        onConfirm={handleRoleChange}
      />

      <ConfirmDialog
        open={removeDialogOpen}
        onOpenChange={setRemoveDialogOpen}
        title={m.team_remove_member_title()}
        description={
          <>
            <strong>{memberName}</strong> {m.team_remove_member_description_suffix()}
          </>
        }
        variant="destructive"
        confirmLabel={isLoading ? m.team_removing() : m.team_remove_from_team()}
        isPending={isLoading}
        onConfirm={handleRemove}
      />
    </>
  )
}

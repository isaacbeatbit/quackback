import type { ReactNode } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { z } from 'zod'
import { adminQueries } from '@/lib/client/queries/admin'
import { Squares2X2Icon, ChatBubbleLeftIcon } from '@heroicons/react/24/solid'
import { EmptyState } from '@/components/shared/empty-state'
import { PageHeader } from '@/components/shared/page-header'
import { SettingsCard } from '@/components/admin/settings/settings-card'
import { BackLink } from '@/components/ui/back-link'
import { CreateBoardDialog } from '@/components/admin/settings/boards/create-board-dialog'
import { BoardSettingsHeader } from '@/components/admin/settings/boards/board-settings-header'
import { BoardSettingsNav } from '@/components/admin/settings/boards/board-settings-nav'
import { BoardGeneralForm } from '@/components/admin/settings/boards/board-general-form'
import { BoardAccessForm } from '@/components/admin/settings/boards/board-access-form'
import { BoardImportSection } from '@/components/admin/settings/boards/board-import-section'
import { BoardExportSection } from '@/components/admin/settings/boards/board-export-section'
import { DeleteBoardForm } from '@/components/admin/settings/boards/delete-board-form'
import {
  useBoardSelection,
  type BoardTab,
} from '@/components/admin/settings/boards/use-board-selection'
import type { BoardId } from '@quackback/ids'
import * as m from '@/paraglide/messages'

/** Board data as returned from server functions (dates serialized as strings) */
interface BoardForSettings {
  id: BoardId
  name: string
  slug: string
  description: string | null
  isPublic: boolean
}

const searchSchema = z.object({
  board: z.string().optional(),
  tab: z.enum(['general', 'access', 'import', 'export']).optional(),
})

export const Route = createFileRoute('/admin/settings/boards/')({
  validateSearch: searchSchema,
  loader: async ({ context }) => {
    const { queryClient } = context
    await queryClient.ensureQueryData(adminQueries.boardsForSettings())
    return {}
  },
  component: BoardsSettingsPage,
})

function BoardsSettingsPage() {
  const { data: boards } = useSuspenseQuery(adminQueries.boardsForSettings())
  const { selectedBoardSlug, selectedTab, setSelectedBoard } = useBoardSelection()

  // Auto-select first board if none selected
  useEffect(() => {
    if (boards.length > 0 && !selectedBoardSlug) {
      setSelectedBoard(boards[0].slug)
    }
  }, [boards, selectedBoardSlug, setSelectedBoard])

  const currentBoard = boards.find((b) => b.slug === selectedBoardSlug)

  // No boards - show empty state
  if (boards.length === 0) {
    return <EmptyBoardsState />
  }

  // Board not found (invalid slug in URL)
  if (!currentBoard) {
    return null // Will auto-redirect via useEffect
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="lg:hidden">
        <BackLink to="/admin/settings">{m.nav_settings()}</BackLink>
      </div>
      <BoardSettingsHeader currentBoard={currentBoard} allBoards={boards} />

      <div className="flex flex-col lg:flex-row gap-8">
        <BoardSettingsNav />

        <div className="flex-1 space-y-6">
          <BoardTabContent board={currentBoard} tab={selectedTab} />
        </div>
      </div>
    </div>
  )
}

interface BoardTabContentProps {
  board: BoardForSettings
  tab: BoardTab
}

function BoardTabContent({ board, tab }: BoardTabContentProps): ReactNode {
  switch (tab) {
    case 'general':
      return (
        <div className="space-y-8">
          <SettingsCard title={m.board_details_title()}>
            <BoardGeneralForm board={board} />
          </SettingsCard>

          <SettingsCard title={m.board_danger_zone_title()} variant="danger">
            <DeleteBoardForm board={board} />
          </SettingsCard>
        </div>
      )

    case 'access':
      return (
        <SettingsCard title={m.board_access_control_title()}>
          <BoardAccessForm board={board} />
        </SettingsCard>
      )

    case 'import':
      return (
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-semibold">{m.board_import_title()}</h2>
            <p className="text-sm text-muted-foreground mt-1">{m.board_import_description()}</p>
          </div>
          <BoardImportSection boardId={board.id} />
        </div>
      )

    case 'export':
      return (
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-semibold">{m.board_export_title()}</h2>
            <p className="text-sm text-muted-foreground mt-1">{m.board_export_description()}</p>
          </div>
          <BoardExportSection boardId={board.id} />
        </div>
      )
  }
}

function EmptyBoardsState() {
  return (
    <div className="space-y-6">
      <PageHeader
        icon={Squares2X2Icon}
        title={m.board_settings_title()}
        description={m.board_settings_description()}
      />

      <div className="rounded-xl border border-border/50 bg-card p-8 shadow-sm">
        <EmptyState
          icon={ChatBubbleLeftIcon}
          title={m.board_empty_title()}
          description={m.board_empty_description()}
          action={<CreateBoardDialog />}
          className="py-8"
        />
      </div>
    </div>
  )
}

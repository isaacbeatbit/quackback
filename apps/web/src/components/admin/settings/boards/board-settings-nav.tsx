import {
  Cog6ToothIcon,
  LockClosedIcon,
  ArrowUpTrayIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/solid'
import { cn } from '@/lib/shared/utils'
import { useBoardSelection, type BoardTab } from './use-board-selection'
import * as m from '@/paraglide/messages'

export function BoardSettingsNav() {
  const { selectedTab, setSelectedTab } = useBoardSelection()
  const navItems: { label: string; tab: BoardTab; icon: typeof Cog6ToothIcon }[] = [
    { label: m.board_general_tab(), tab: 'general', icon: Cog6ToothIcon },
    { label: m.board_access_tab(), tab: 'access', icon: LockClosedIcon },
    { label: m.board_import_tab(), tab: 'import', icon: ArrowUpTrayIcon },
    { label: m.board_export_tab(), tab: 'export', icon: ArrowDownTrayIcon },
  ]

  return (
    <nav className="w-full lg:w-48 shrink-0">
      <div className="lg:sticky lg:top-6">
        <ul className="flex lg:flex-col gap-1 overflow-x-auto">
          {navItems.map((item) => {
            const isActive = selectedTab === item.tab
            const Icon = item.icon

            return (
              <li key={item.tab}>
                <button
                  type="button"
                  onClick={() => setSelectedTab(item.tab)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm whitespace-nowrap transition-colors',
                    isActive
                      ? 'bg-secondary text-foreground font-medium'
                      : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </nav>
  )
}

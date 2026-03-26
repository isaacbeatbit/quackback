import { MagnifyingGlassIcon, DocumentIcon } from '@heroicons/react/24/solid'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/empty-state'
import * as m from '@/paraglide/messages'

interface InboxEmptyStateProps {
  type: 'no-posts' | 'no-results' | 'no-selection'
  onClearFilters?: () => void
}

export function InboxEmptyState({ type, onClearFilters }: InboxEmptyStateProps) {
  if (type === 'no-posts' || type === 'no-results') {
    return (
      <EmptyState
        icon={MagnifyingGlassIcon}
        title={m.feedback_inbox_empty_filters_title()}
        description={m.feedback_inbox_empty_filters_description()}
        action={
          onClearFilters && (
            <Button variant="outline" onClick={onClearFilters}>
              {m.feedback_inbox_clear_filters()}
            </Button>
          )
        }
      />
    )
  }

  // no-selection
  return (
    <EmptyState
      icon={DocumentIcon}
      title={m.feedback_inbox_empty_selection_title()}
      description={m.feedback_inbox_empty_selection_description()}
      className="h-full"
    />
  )
}

import {
  LightBulbIcon,
  BugAntIcon,
  ChatBubbleOvalLeftEllipsisIcon,
  PuzzlePieceIcon,
  UserGroupIcon,
  BuildingStorefrontIcon,
  WrenchScrewdriverIcon,
  SparklesIcon,
} from '@heroicons/react/24/solid'
import type { ComponentType } from 'react'
import type { UseCaseType } from '@/lib/shared/db-types'
import * as m from '@/paraglide/messages'

export interface DefaultBoardOption {
  id: string
  name: string
  description: string
  icon: ComponentType<{ className?: string }>
  /** Use cases where this board should be pre-selected */
  useCases: UseCaseType[]
}

/**
 * Default board templates for onboarding.
 * Users can toggle these on/off during setup.
 * Boards are personalized based on the selected use case.
 */
export const DEFAULT_BOARD_OPTIONS: DefaultBoardOption[] = [
  // Common boards (most use cases)
  {
    id: 'feature-requests',
    name: m.onboarding_board_feature_requests_name(),
    description: m.onboarding_board_feature_requests_description(),
    icon: LightBulbIcon,
    useCases: ['saas', 'consumer', 'marketplace'],
  },
  {
    id: 'bug-reports',
    name: m.onboarding_board_bug_reports_name(),
    description: m.onboarding_board_bug_reports_description(),
    icon: BugAntIcon,
    useCases: ['saas', 'consumer', 'marketplace'],
  },
  // SaaS-specific
  {
    id: 'integrations',
    name: m.onboarding_board_integrations_name(),
    description: m.onboarding_board_integrations_description(),
    icon: PuzzlePieceIcon,
    useCases: ['saas'],
  },
  // Consumer-specific
  {
    id: 'ux-feedback',
    name: m.onboarding_board_ux_feedback_name(),
    description: m.onboarding_board_ux_feedback_description(),
    icon: SparklesIcon,
    useCases: ['consumer'],
  },
  // Platform-specific
  {
    id: 'seller-feedback',
    name: m.onboarding_board_seller_feedback_name(),
    description: m.onboarding_board_seller_feedback_description(),
    icon: BuildingStorefrontIcon,
    useCases: ['marketplace'],
  },
  {
    id: 'buyer-feedback',
    name: m.onboarding_board_buyer_feedback_name(),
    description: m.onboarding_board_buyer_feedback_description(),
    icon: UserGroupIcon,
    useCases: ['marketplace'],
  },
  // Internal-specific
  {
    id: 'product-ideas',
    name: m.onboarding_board_product_ideas_name(),
    description: m.onboarding_board_product_ideas_description(),
    icon: LightBulbIcon,
    useCases: ['internal'],
  },
  {
    id: 'process-improvements',
    name: m.onboarding_board_process_improvements_name(),
    description: m.onboarding_board_process_improvements_description(),
    icon: WrenchScrewdriverIcon,
    useCases: ['internal'],
  },
  {
    id: 'general-feedback',
    name: m.onboarding_board_general_feedback_name(),
    description: m.onboarding_board_general_feedback_description(),
    icon: ChatBubbleOvalLeftEllipsisIcon,
    useCases: ['internal'],
  },
]

/**
 * Get board IDs that should be pre-selected for a given use case.
 * Falls back to feature requests and bug reports if no use case is specified.
 */
export function getBoardsForUseCase(useCase?: UseCaseType): Set<string> {
  if (!useCase) {
    // Default: select common boards
    return new Set(['feature-requests', 'bug-reports'])
  }

  // Select boards that match the use case
  return new Set(DEFAULT_BOARD_OPTIONS.filter((b) => b.useCases.includes(useCase)).map((b) => b.id))
}

/**
 * Get boards filtered by use case for display.
 */
export function getBoardOptionsForUseCase(useCase?: UseCaseType): DefaultBoardOption[] {
  if (!useCase) {
    return DEFAULT_BOARD_OPTIONS.filter(
      (b) => b.useCases.includes('saas') || b.useCases.includes('consumer')
    )
  }

  return DEFAULT_BOARD_OPTIONS.filter((b) => b.useCases.includes(useCase))
}

/**
 * Get a human-readable label for a use case.
 */
export function getUseCaseLabel(useCase?: UseCaseType): string {
  switch (useCase) {
    case 'saas':
      return m.onboarding_usecase_label_saas()
    case 'consumer':
      return m.onboarding_usecase_label_consumer()
    case 'marketplace':
      return m.onboarding_usecase_label_marketplace()
    case 'internal':
      return m.onboarding_usecase_label_internal()
    default:
      return m.onboarding_usecase_label_default()
  }
}

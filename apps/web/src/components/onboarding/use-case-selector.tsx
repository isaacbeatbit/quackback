'use client'

import {
  ComputerDesktopIcon,
  DevicePhoneMobileIcon,
  BuildingStorefrontIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline'
import type { UseCaseType } from '@/lib/shared/db-types'
import type { ComponentType } from 'react'
import * as m from '@/paraglide/messages'

interface UseCaseOption {
  id: UseCaseType
  label: string
  description: string
  icon: ComponentType<{ className?: string }>
}

interface UseCaseSelectorProps {
  value: UseCaseType | undefined
  onChange: (value: UseCaseType) => void
  disabled?: boolean
}

export function UseCaseSelector({ value, onChange, disabled }: UseCaseSelectorProps) {
  const useCaseOptions: UseCaseOption[] = [
    {
      id: 'saas',
      label: m.onboarding_usecase_option_saas_label(),
      description: m.onboarding_usecase_option_saas_description(),
      icon: ComputerDesktopIcon,
    },
    {
      id: 'consumer',
      label: m.onboarding_usecase_option_consumer_label(),
      description: m.onboarding_usecase_option_consumer_description(),
      icon: DevicePhoneMobileIcon,
    },
    {
      id: 'marketplace',
      label: m.onboarding_usecase_option_marketplace_label(),
      description: m.onboarding_usecase_option_marketplace_description(),
      icon: BuildingStorefrontIcon,
    },
    {
      id: 'internal',
      label: m.onboarding_usecase_option_internal_label(),
      description: m.onboarding_usecase_option_internal_description(),
      icon: UserGroupIcon,
    },
  ]

  return (
    <div className="space-y-2 max-w-sm mx-auto">
      {useCaseOptions.map((option) => {
        const isSelected = value === option.id
        const Icon = option.icon
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            disabled={disabled}
            className={`
              w-full flex items-center gap-4 p-4
              rounded-xl border transition-all duration-200
              disabled:cursor-not-allowed disabled:opacity-50
              ${
                isSelected
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-border/50 bg-card/50 hover:border-border hover:bg-card/80'
              }
            `}
          >
            {/* Icon */}
            <div
              className={`
              shrink-0 p-2.5 rounded-lg transition-colors
              ${isSelected ? 'bg-primary/10' : 'bg-muted/50'}
            `}
            >
              <Icon
                className={`h-5 w-5 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}
              />
            </div>

            {/* Text */}
            <div className="text-left min-w-0">
              <div
                className={`font-medium text-sm ${isSelected ? 'text-foreground' : 'text-foreground/90'}`}
              >
                {option.label}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">{option.description}</div>
            </div>
          </button>
        )
      })}
    </div>
  )
}

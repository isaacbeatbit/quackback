import { useState } from 'react'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { ArrowPathIcon } from '@heroicons/react/24/solid'
import { Button } from '@/components/ui/button'
import { checkOnboardingState } from '@/lib/server/functions/admin'
import { saveUseCaseFn } from '@/lib/server/functions/onboarding'
import { UseCaseSelector } from '@/components/onboarding/use-case-selector'
import type { UseCaseType } from '@/lib/shared/db-types'
import * as m from '@/paraglide/messages'

export const Route = createFileRoute('/onboarding/_layout/usecase')({
  loader: async ({ context }) => {
    const { session } = context

    if (!session?.user) {
      throw redirect({ to: '/onboarding/account' })
    }

    const state = await checkOnboardingState({ data: session.user.id })

    if (state.needsInvitation) {
      throw redirect({ to: '/auth/login' })
    }

    // If workspace is already set up, go to boards
    if (state.setupState?.steps?.workspace) {
      throw redirect({ to: '/onboarding/boards' })
    }

    return {
      existingUseCase: state.setupState?.useCase,
    }
  },
  component: UseCaseStep,
})

function UseCaseStep() {
  const navigate = useNavigate()
  const { existingUseCase } = Route.useLoaderData()

  const [useCase, setUseCase] = useState<UseCaseType | undefined>(existingUseCase)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleContinue() {
    if (!useCase) {
      setError(m.onboarding_usecase_required())
      return
    }

    setIsLoading(true)
    setError('')

    try {
      await saveUseCaseFn({ data: { useCase } })
      navigate({ to: '/onboarding/workspace' })
    } catch (err) {
      setError(err instanceof Error ? err.message : m.error_something_went_wrong())
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold mb-2">{m.onboarding_usecase_title()}</h1>
        <p className="text-muted-foreground">{m.onboarding_usecase_description()}</p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive text-center">
          {error}
        </div>
      )}

      {/* Use case selector */}
      <div className="mb-8">
        <UseCaseSelector value={useCase} onChange={setUseCase} disabled={isLoading} />
      </div>

      {/* Continue button */}
      <div className="max-w-xs mx-auto">
        <Button onClick={handleContinue} disabled={isLoading || !useCase} className="w-full h-11">
          {isLoading ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : m.common_continue()}
        </Button>
      </div>
    </div>
  )
}

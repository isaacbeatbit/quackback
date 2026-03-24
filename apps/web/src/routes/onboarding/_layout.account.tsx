import { useState } from 'react'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { ArrowPathIcon } from '@heroicons/react/24/solid'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { authClient } from '@/lib/server/auth/client'
import { checkOnboardingState } from '@/lib/server/functions/admin'
import * as m from '@/paraglide/messages'

export const Route = createFileRoute('/onboarding/_layout/account')({
  loader: async ({ context }) => {
    const { session } = context

    if (session?.user) {
      const state = await checkOnboardingState({ data: session.user.id })

      if (state.needsInvitation) {
        throw redirect({ to: '/auth/login' })
      }

      if (state.setupState?.steps?.workspace) {
        throw redirect({ to: '/onboarding/boards' })
      }

      // If use case is selected, go to workspace; otherwise go to use case selection
      if (state.setupState?.useCase) {
        throw redirect({ to: '/onboarding/workspace' })
      }

      throw redirect({ to: '/onboarding/usecase' })
    }

    return {}
  },
  component: AccountStep,
})

function AccountStep() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!name.trim() || name.trim().length < 2) {
      setError(m.onboarding_account_name_required())
      return
    }
    if (!email.trim()) {
      setError(m.onboarding_account_email_required())
      return
    }
    if (!password || password.length < 8) {
      setError(m.auth_password_min_length())
      return
    }

    setError('')
    setIsLoading(true)

    try {
      const result = await authClient.signUp.email({
        name: name.trim(),
        email,
        password,
      })

      if (result.error) {
        throw new Error(result.error.message || m.onboarding_account_failed_create())
      }

      window.location.href = '/onboarding/usecase'
    } catch (err) {
      setError(err instanceof Error ? err.message : m.onboarding_account_failed_create())
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Main card */}
      <div className="overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-b from-card/90 to-card/70 backdrop-blur-sm">
        <div className="p-8">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold">{m.onboarding_account_title()}</h1>
            <p className="mt-2 text-muted-foreground">{m.onboarding_account_description()}</p>
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                {m.onboarding_account_name_label()}
              </label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder={m.auth_jane_doe()}
                autoComplete="name"
                autoFocus
                disabled={isLoading}
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                {m.onboarding_account_email_label()}
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder={m.onboarding_account_email_placeholder()}
                autoComplete="email"
                disabled={isLoading}
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                {m.auth_password()}
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder={m.auth_password_placeholder_signup()}
                autoComplete="new-password"
                disabled={isLoading}
                className="h-11"
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading || !email.trim() || !name.trim() || password.length < 8}
              className="w-full h-11"
            >
              {isLoading ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : m.common_continue()}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}

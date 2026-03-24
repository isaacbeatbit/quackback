import { createFileRoute, Link, useSearch } from '@tanstack/react-router'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { FormError } from '@/components/shared/form-error'
import { ArrowPathIcon, CheckCircleIcon } from '@heroicons/react/24/solid'
import { authClient } from '@/lib/server/auth/client'
import * as m from '@/paraglide/messages'

export const Route = createFileRoute('/auth/reset-password')({
  validateSearch: (search: Record<string, unknown>) => ({
    token: (search.token as string) || '',
    error: (search.error as string) || '',
  }),
  component: ResetPasswordPage,
})

function ResetPasswordPage() {
  const { token, error: urlError } = useSearch({ from: '/auth/reset-password' })
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState(
    urlError === 'INVALID_TOKEN' ? m.auth_invalid_reset_link() : ''
  )
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!token) {
      setError(m.auth_missing_reset_token())
      return
    }
    if (newPassword.length < 8) {
      setError(m.auth_password_min_length())
      return
    }
    if (newPassword !== confirmPassword) {
      setError(m.auth_passwords_do_not_match())
      return
    }

    setLoading(true)
    try {
      const result = await authClient.resetPassword({
        newPassword,
        token,
      })
      if (result.error) {
        throw new Error(result.error.message || m.auth_failed_reset_password())
      }
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : m.auth_failed_reset_password())
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="w-full max-w-md space-y-8 px-4 text-center">
          <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto" />
          <h1 className="text-2xl font-bold">{m.auth_password_reset()}</h1>
          <p className="text-muted-foreground">{m.auth_password_updated_success()}</p>
          <Link to="/auth/login">
            <Button className="w-full">{m.auth_sign_in()}</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-8 px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold">{m.auth_set_new_password()}</h1>
          <p className="mt-2 text-muted-foreground">{m.auth_enter_new_password()}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <FormError message={error} />}

          <div className="space-y-2">
            <label htmlFor="new-password" className="text-sm font-medium">
              {m.auth_new_password()}
            </label>
            <Input
              id="new-password"
              type="password"
              placeholder={m.auth_password_placeholder_signup()}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={loading || !token}
              autoComplete="new-password"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="confirm-password" className="text-sm font-medium">
              {m.auth_confirm_password()}
            </label>
            <Input
              id="confirm-password"
              type="password"
              placeholder={m.auth_confirm_password_placeholder()}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading || !token}
              autoComplete="new-password"
            />
          </div>

          <Button
            type="submit"
            disabled={
              loading || !token || newPassword.length < 8 || newPassword !== confirmPassword
            }
            className="w-full"
          >
            {loading ? (
              <>
                <ArrowPathIcon className="mr-2 h-4 w-4 animate-spin" />
                {m.auth_resetting_password()}
              </>
            ) : (
              m.auth_reset_password_button()
            )}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          <Link to="/auth/login" className="font-medium text-primary hover:underline">
            {m.auth_back_to_sign_in()}
          </Link>
        </p>
      </div>
    </div>
  )
}

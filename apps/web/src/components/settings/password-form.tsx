import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { ArrowPathIcon } from '@heroicons/react/24/solid'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { FormError } from '@/components/shared/form-error'
import { authClient } from '@/lib/server/auth/client'
import { setPasswordFn } from '@/lib/server/functions/invitations'
import * as m from '@/paraglide/messages'

export function PasswordForm() {
  const [hasPassword, setHasPassword] = useState<boolean | null>(null)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    authClient.listAccounts().then((result) => {
      if (result.data) {
        const hasCredential = result.data.some(
          (acc: { providerId: string }) => acc.providerId === 'credential'
        )
        setHasPassword(hasCredential)
      }
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

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
      if (hasPassword) {
        if (!currentPassword) {
          setError(m.settings_password_current_required())
          setLoading(false)
          return
        }
        const result = await authClient.changePassword({
          currentPassword,
          newPassword,
          revokeOtherSessions: false,
        })
        if (result.error) {
          throw new Error(result.error.message || m.settings_password_change_failed())
        }
        toast.success(m.settings_password_changed_success())
      } else {
        await setPasswordFn({ data: { newPassword } })
        setHasPassword(true)
        toast.success(m.settings_password_set_success())
      }
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setError(err instanceof Error ? err.message : m.settings_password_update_failed())
    } finally {
      setLoading(false)
    }
  }

  // Loading accounts
  if (hasPassword === null) {
    return (
      <div className="rounded-xl border border-border/50 bg-card p-6 shadow-sm">
        <h2 className="font-medium mb-1">{m.settings_password_title()}</h2>
        <p className="text-sm text-muted-foreground mb-4">{m.settings_password_loading()}</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="rounded-xl border border-border/50 bg-card p-6 shadow-sm">
        <h2 className="font-medium mb-1">
          {hasPassword ? m.settings_password_change_title() : m.settings_password_set_title()}
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          {hasPassword
            ? m.settings_password_change_description()
            : m.settings_password_set_description()}
        </p>

        <div className="space-y-4">
          {error && <FormError message={error} />}

          {hasPassword && (
            <div className="space-y-2">
              <label htmlFor="current-password" className="text-sm font-medium">
                {m.settings_password_current_label()}
              </label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={loading}
                autoComplete="current-password"
              />
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
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
                disabled={loading}
                autoComplete="new-password"
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
                disabled={loading}
                autoComplete="new-password"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={
                loading ||
                newPassword.length < 8 ||
                newPassword !== confirmPassword ||
                (hasPassword && !currentPassword)
              }
            >
              {loading ? (
                <>
                  <ArrowPathIcon className="h-4 w-4 animate-spin mr-2" />
                  {hasPassword ? m.settings_password_changing() : m.settings_password_setting()}
                </>
              ) : hasPassword ? (
                m.settings_password_change_title()
              ) : (
                m.settings_password_set_title()
              )}
            </Button>
          </div>
        </div>
      </div>
    </form>
  )
}

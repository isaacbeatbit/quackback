import { useState, useEffect, useRef } from 'react'
import { OAuthButtons, getEnabledOAuthProviders } from './oauth-buttons'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { FormError } from '@/components/shared/form-error'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  ArrowPathIcon,
  InformationCircleIcon,
  EnvelopeIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/solid'
import { authClient } from '@/lib/server/auth/client'
import type { PortalAuthMethods } from '@/lib/server/domains/settings'
import * as m from '@/paraglide/messages'

interface InvitationInfo {
  id: string
  email: string
  name: string | null
  role: string | null
  workspaceName: string
  inviterName: string | null
}

interface PortalAuthFormProps {
  mode?: 'login' | 'signup'
  invitationId?: string | null
  callbackUrl?: string
  /** Auth method configuration (which methods are enabled) */
  authConfig?: PortalAuthMethods
  /** Display name overrides for generic OAuth providers */
  customProviderNames?: Record<string, string>
}

type Step = 'credentials' | 'email' | 'code' | 'forgot' | 'reset'

/**
 * Portal Auth Form
 *
 * Unified authentication form for portal users supporting:
 * - Password (sign in / sign up)
 * - Email OTP (magic codes)
 * - OAuth (GitHub, Google, etc.)
 * - Forgot/reset password via email link
 *
 * Flow: credentials → redirect (or email → code → redirect for OTP)
 * - Better-auth automatically creates users if they don't exist
 * - Name can be provided during signup
 * - Invitation acceptance happens after authentication
 */
export function PortalAuthForm({
  mode = 'login',
  invitationId,
  callbackUrl = '/',
  authConfig,
  customProviderNames,
}: PortalAuthFormProps) {
  const passwordEnabled = authConfig?.password ?? true
  const emailOtpEnabled = authConfig?.email ?? false
  const oauthProviders = authConfig ? getEnabledOAuthProviders(authConfig, customProviderNames) : []

  // Default step depends on what's enabled
  const defaultStep: Step = passwordEnabled ? 'credentials' : 'email'

  const [step, setStep] = useState<Step>(defaultStep)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [invitation, setInvitation] = useState<InvitationInfo | null>(null)
  const [loadingInvitation, setLoadingInvitation] = useState(!!invitationId)

  const codeInputRef = useRef<HTMLInputElement>(null)

  // Fetch invitation details if invitationId is provided
  useEffect(() => {
    if (!invitationId) {
      setLoadingInvitation(false)
      return
    }

    async function fetchInvitation() {
      try {
        const response = await fetch(`/api/auth/invitation/${invitationId}`)
        if (response.ok) {
          const data = (await response.json()) as InvitationInfo
          setInvitation(data)
          setEmail(data.email)
        } else {
          const data = (await response.json()) as { error?: string }
          setError(data.error || m.auth_invalid_or_expired_invitation())
        }
      } catch {
        setError(m.auth_failed_load_invitation())
      } finally {
        setLoadingInvitation(false)
      }
    }

    fetchInvitation()
  }, [invitationId])

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCooldown])

  // Focus code input when entering code/reset steps
  useEffect(() => {
    if ((step === 'code' || step === 'reset') && codeInputRef.current) {
      codeInputRef.current.focus()
    }
  }, [step])

  // --- Password auth handlers ---
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email.trim()) {
      setError(m.auth_email_required())
      return
    }
    if (!password) {
      setError(m.auth_password_required())
      return
    }
    if (mode === 'signup' && password.length < 8) {
      setError(m.auth_password_min_length())
      return
    }

    setLoading(true)
    try {
      if (mode === 'signup') {
        const result = await authClient.signUp.email({
          name: name.trim() || email.split('@')[0],
          email,
          password,
        })
        if (result.error) {
          throw new Error(result.error.message || m.auth_failed_create_account())
        }
      } else {
        const result = await authClient.signIn.email({
          email,
          password,
        })
        if (result.error) {
          throw new Error(result.error.message || m.auth_invalid_email_or_password())
        }
      }
      window.location.href = callbackUrl
    } catch (err) {
      setError(err instanceof Error ? err.message : m.auth_authentication_failed())
    } finally {
      setLoading(false)
    }
  }

  // --- Email OTP handlers ---
  const sendCode = async () => {
    setError('')
    setLoading(true)

    try {
      const result = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: 'sign-in',
      })

      if (result.error) {
        throw new Error(result.error.message || m.auth_failed_send_code())
      }

      setStep('code')
      setResendCooldown(60)
    } catch (err) {
      setError(err instanceof Error ? err.message : m.auth_failed_send_code())
    } finally {
      setLoading(false)
    }
  }

  const verifyCode = async () => {
    setError('')
    setLoading(true)

    try {
      const result = await authClient.signIn.emailOtp({
        email,
        otp: code,
      })

      if (result.error) {
        throw new Error(result.error.message || m.auth_failed_verify_code())
      }

      window.location.href = callbackUrl
    } catch (err) {
      setError(err instanceof Error ? err.message : m.auth_failed_verify_code())
    } finally {
      setLoading(false)
    }
  }

  // --- Forgot password handler ---
  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email.trim()) {
      setError(m.auth_email_required())
      return
    }

    setLoading(true)
    try {
      const result = await authClient.requestPasswordReset({
        email,
        redirectTo: '/auth/reset-password',
      })
      if (result.error) {
        throw new Error(result.error.message || m.auth_failed_send_reset_link())
      }
      setStep('reset')
    } catch (err) {
      setError(err instanceof Error ? err.message : m.auth_failed_send_reset_link())
    } finally {
      setLoading(false)
    }
  }

  // --- Form submit handlers ---
  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      setError(m.auth_email_required())
      return
    }
    sendCode()
  }

  const handleCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!code.trim() || code.length !== 6) {
      setError(m.auth_enter_6_digit_code())
      return
    }
    verifyCode()
  }

  const handleResend = () => {
    if (resendCooldown > 0) return
    setCode('')
    sendCode()
  }

  const handleBack = () => {
    setError('')
    setCode('')
    setStep(defaultStep)
  }

  // Loading invitation
  if (loadingInvitation) {
    return (
      <div className="flex items-center justify-center py-8">
        <ArrowPathIcon className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // If we tried to load an invitation but it failed, show the error
  if (invitationId && !invitation && error) {
    return (
      <Alert variant="destructive">
        <InformationCircleIcon className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  // Determine what's visible on the default step
  const showOAuthOnDefault =
    (step === 'credentials' || step === 'email') && !invitation && oauthProviders.length > 0
  const hasCredentialForm = step === 'credentials' && passwordEnabled
  const hasEmailForm = step === 'email' && emailOtpEnabled

  return (
    <div className="space-y-6">
      {/* Invitation Banner */}
      {invitation && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-start gap-3">
            <EnvelopeIcon className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium text-foreground">{m.auth_invited_title()}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {m.auth_create_account_join_workspace({ workspaceName: invitation.workspaceName })}
                {invitation.inviterName && (
                  <> ({m.auth_invited_by({ name: invitation.inviterName })})</>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* OAuth Providers - show on default step for non-invitation flow */}
      {showOAuthOnDefault && (
        <>
          <OAuthButtons callbackUrl={callbackUrl} providers={oauthProviders} />
          {/* Divider - only show when another method is also enabled below */}
          {(passwordEnabled || emailOtpEnabled) && (
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-background px-2 text-muted-foreground">
                  {passwordEnabled
                    ? m.auth_or_continue_with_email()
                    : m.auth_or_continue_with_email_code()}
                </span>
              </div>
            </div>
          )}
        </>
      )}

      {/* Password credentials form (default when password enabled) */}
      {hasCredentialForm && (
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          {error && <FormError message={error} />}

          {mode === 'signup' && (
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                {m.auth_name()}
              </label>
              <Input
                id="name"
                type="text"
                placeholder={m.auth_jane_doe()}
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
                autoComplete="name"
              />
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              {m.auth_email()}
            </label>
            <Input
              id="email"
              type="email"
              placeholder={m.auth_email_placeholder()}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!!invitation || loading}
              className={invitation ? 'bg-muted' : ''}
              autoComplete="email"
            />
            {invitation && (
              <p className="text-xs text-muted-foreground">{m.auth_email_from_invitation()}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              {m.auth_password()}
            </label>
            <Input
              id="password"
              type="password"
              placeholder={mode === 'signup' ? m.auth_password_placeholder_signup() : '••••••••'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            />
          </div>

          {mode === 'login' && (
            <div className="text-right">
              <button
                type="button"
                onClick={() => {
                  setError('')
                  setStep('forgot')
                }}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                {m.auth_forgot_password()}
              </button>
            </div>
          )}

          <Button type="submit" disabled={loading} className="w-full">
            {loading && <ArrowPathIcon className="mr-2 h-4 w-4 animate-spin" />}
            {loading
              ? mode === 'signup'
                ? m.auth_creating_account()
                : m.auth_signing_in()
              : mode === 'signup'
                ? m.auth_create_account()
                : m.auth_sign_in()}
          </Button>

          {/* Link to email OTP if also enabled */}
          {emailOtpEnabled && (
            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setError('')
                  setStep('email')
                }}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                {m.auth_use_email_code_instead()}
              </button>
            </div>
          )}
        </form>
      )}

      {/* Email OTP: email input step */}
      {hasEmailForm && (
        <form onSubmit={handleEmailSubmit} className="space-y-4">
          {error && <FormError message={error} />}

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              {m.auth_email()}
            </label>
            <Input
              id="email"
              type="email"
              placeholder={m.auth_email_placeholder()}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!!invitation || loading}
              className={invitation ? 'bg-muted' : ''}
              autoComplete="email"
            />
            {invitation && (
              <p className="text-xs text-muted-foreground">{m.auth_email_from_invitation()}</p>
            )}
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? (
              <>
                <ArrowPathIcon className="mr-2 h-4 w-4 animate-spin" />
                {m.auth_sending_code()}
              </>
            ) : (
              m.auth_continue_with_email()
            )}
          </Button>

          {/* Link back to password if also enabled */}
          {passwordEnabled && (
            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setError('')
                  setStep('credentials')
                }}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                {m.auth_use_password_instead()}
              </button>
            </div>
          )}
        </form>
      )}

      {/* Email OTP: code verification step */}
      {step === 'code' && (
        <form onSubmit={handleCodeSubmit} className="space-y-4">
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeftIcon className="mr-1 h-4 w-4" />
            {m.auth_back()}
          </button>

          <div className="rounded-lg bg-muted/50 p-4">
            <p className="text-sm text-center">{m.auth_sent_code_to({ email })}</p>
          </div>

          {error && <FormError message={error} />}

          <div className="space-y-2">
            <label htmlFor="code" className="text-sm font-medium">
              {m.auth_verification_code()}
            </label>
            <Input
              ref={codeInputRef}
              id="code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder={m.auth_code_placeholder()}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              disabled={loading}
              className="text-center text-2xl tracking-widest"
              autoComplete="one-time-code"
            />
          </div>

          <Button type="submit" disabled={loading || code.length !== 6} className="w-full">
            {loading ? (
              <>
                <ArrowPathIcon className="mr-2 h-4 w-4 animate-spin" />
                {m.auth_verifying()}
              </>
            ) : (
              m.auth_verify_code()
            )}
          </Button>

          <div className="text-center">
            <button
              type="button"
              onClick={handleResend}
              disabled={resendCooldown > 0 || loading}
              className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resendCooldown > 0
                ? m.auth_resend_code_in({ seconds: resendCooldown })
                : m.auth_resend_code()}
            </button>
          </div>
        </form>
      )}

      {/* Forgot password: enter email */}
      {step === 'forgot' && (
        <form onSubmit={handleForgotSubmit} className="space-y-4">
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeftIcon className="mr-1 h-4 w-4" />
            {m.auth_back()}
          </button>

          <div className="text-center">
            <h2 className="text-lg font-semibold">{m.auth_reset_password()}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{m.auth_reset_password_help()}</p>
          </div>

          {error && <FormError message={error} />}

          <div className="space-y-2">
            <label htmlFor="forgot-email" className="text-sm font-medium">
              {m.auth_email()}
            </label>
            <Input
              id="forgot-email"
              type="email"
              placeholder={m.auth_email_placeholder()}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              autoComplete="email"
            />
          </div>

          <Button type="submit" disabled={loading || !email.trim()} className="w-full">
            {loading ? (
              <>
                <ArrowPathIcon className="mr-2 h-4 w-4 animate-spin" />
                {m.auth_sending_link()}
              </>
            ) : (
              m.auth_send_reset_link()
            )}
          </Button>
        </form>
      )}

      {/* Reset password: check email confirmation */}
      {step === 'reset' && (
        <div className="space-y-4">
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeftIcon className="mr-1 h-4 w-4" />
            {m.auth_back()}
          </button>

          <div className="text-center space-y-3">
            <EnvelopeIcon className="h-10 w-10 text-primary mx-auto" />
            <h2 className="text-lg font-semibold">{m.auth_check_email()}</h2>
            <p className="text-sm text-muted-foreground">{m.auth_reset_link_sent({ email })}</p>
          </div>
        </div>
      )}
    </div>
  )
}

import { useState, useEffect, useRef } from 'react'
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
import { AUTH_PROVIDER_ICON_MAP } from '@/components/icons/social-provider-icons'
import {
  getEnabledOAuthProviders,
  getOAuthRedirectUrl,
  type OAuthProviderEntry,
} from '@/components/auth/oauth-buttons'
import { openAuthPopup, usePopupTracker } from '@/lib/client/hooks/use-auth-broadcast'
import { authClient } from '@/lib/server/auth/client'
import * as m from '@/paraglide/messages'

interface OrgAuthConfig {
  found: boolean
  oauth: Record<string, boolean | undefined>
  openSignup?: boolean
  customProviderNames?: Record<string, string>
}

interface InvitationInfo {
  id: string
  email: string
  role: string | null
  workspaceName: string
  inviterName: string | null
}

interface PortalAuthFormInlineProps {
  mode: 'login' | 'signup'
  authConfig?: OrgAuthConfig | null
  invitationId?: string | null
  onModeSwitch?: (mode: 'login' | 'signup') => void
}

type Step = 'credentials' | 'email' | 'code' | 'forgot' | 'reset'

interface OAuthButtonProps {
  icon: React.ReactNode | null
  label: string
  mode: 'login' | 'signup'
  loading: boolean
  disabled: boolean
  onClick: () => void
}

function OAuthButton({ icon, label, mode, loading, disabled, onClick }: OAuthButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={onClick}
      className="w-full"
      disabled={disabled}
    >
      {loading ? <ArrowPathIcon className="h-5 w-5 animate-spin" /> : icon}
      {mode === 'login'
        ? m.auth_sign_in_with_provider({ provider: label })
        : m.auth_sign_up_with_provider({ provider: label })}
    </Button>
  )
}

export function PortalAuthFormInline({
  mode,
  authConfig,
  invitationId,
  onModeSwitch,
}: PortalAuthFormInlineProps) {
  const passwordEnabled = authConfig?.oauth?.password ?? true
  const emailOtpEnabled = authConfig?.oauth?.email !== false
  const defaultStep: Step = passwordEnabled ? 'credentials' : 'email'

  const [step, setStep] = useState<Step>(defaultStep)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loadingAction, setLoadingAction] = useState<string | null>(null)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [invitation, setInvitation] = useState<InvitationInfo | null>(null)
  const [loadingInvitation, setLoadingInvitation] = useState(!!invitationId)
  const [popupBlocked, setPopupBlocked] = useState(false)

  const codeInputRef = useRef<HTMLInputElement>(null)

  const { trackPopup, clearPopup, hasPopup, focusPopup } = usePopupTracker({
    onPopupClosed: () => {
      setLoadingAction(null)
      setPopupBlocked(false)
    },
  })

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

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCooldown])

  useEffect(() => {
    if ((step === 'code' || step === 'reset') && codeInputRef.current) {
      codeInputRef.current.focus()
    }
  }, [step])

  useEffect(() => {
    return () => {
      clearPopup()
    }
  }, [clearPopup])

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

    setLoadingAction('password')
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
        const result = await authClient.signIn.email({ email, password })
        if (result.error) {
          throw new Error(result.error.message || m.auth_invalid_email_or_password())
        }
      }

      const { postAuthSuccess } = await import('@/lib/client/hooks/use-auth-broadcast')
      postAuthSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : m.auth_authentication_failed())
      setLoadingAction(null)
    }
  }

  const sendCode = async () => {
    setError('')
    setLoadingAction('email')

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
      setLoadingAction(null)
    }
  }

  const verifyCode = async () => {
    setError('')
    setLoadingAction('code')

    try {
      const result = await authClient.signIn.emailOtp({ email, otp: code })

      if (result.error) {
        throw new Error(result.error.message || m.auth_failed_verify_code())
      }

      const { postAuthSuccess } = await import('@/lib/client/hooks/use-auth-broadcast')
      postAuthSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : m.auth_failed_verify_code())
      setLoadingAction(null)
    }
  }

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email.trim()) {
      setError(m.auth_email_required())
      return
    }

    setLoadingAction('forgot')
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
      setLoadingAction(null)
    }
  }

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

  const initiateOAuth = async (provider: OAuthProviderEntry) => {
    setError('')

    if (hasPopup()) {
      focusPopup()
      return
    }

    setLoadingAction(provider.id)
    setPopupBlocked(false)

    const popup = openAuthPopup('about:blank')
    if (!popup) {
      setPopupBlocked(true)
      setLoadingAction(null)
      return
    }
    trackPopup(popup)

    try {
      const url = await getOAuthRedirectUrl(provider, '/auth/auth-complete')
      if (url) {
        popup.location.href = url
      } else {
        popup.close()
        setError(m.auth_failed_initiate_sign_in())
        setLoadingAction(null)
      }
    } catch (err) {
      popup.close()
      setError(err instanceof Error ? err.message : m.auth_failed_initiate_sign_in())
      setLoadingAction(null)
    }
  }

  const enabledProviders = getEnabledOAuthProviders(
    authConfig?.oauth ?? {},
    authConfig?.customProviderNames
  )
  const showOAuth = enabledProviders.length > 0

  if (loadingInvitation) {
    return (
      <div className="flex items-center justify-center py-8">
        <ArrowPathIcon className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (invitationId && !invitation && error) {
    return (
      <Alert variant="destructive">
        <InformationCircleIcon className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (popupBlocked) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <InformationCircleIcon className="h-4 w-4" />
          <AlertDescription>{m.auth_popup_blocked()}</AlertDescription>
        </Alert>
        <Button onClick={() => setPopupBlocked(false)} variant="outline" className="w-full">
          {m.error_try_again()}
        </Button>
      </div>
    )
  }

  const showOAuthOnDefault =
    showOAuth && (step === 'credentials' || step === 'email') && !invitation
  const hasCredentialForm = step === 'credentials' && passwordEnabled
  const hasEmailForm = step === 'email' && emailOtpEnabled

  return (
    <div className="space-y-6">
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

      {showOAuthOnDefault && (
        <>
          <div className="space-y-3">
            {enabledProviders.map((provider) => {
              const IconComp = AUTH_PROVIDER_ICON_MAP[provider.id]
              return (
                <OAuthButton
                  key={provider.id}
                  icon={IconComp ? <IconComp className="h-5 w-5" /> : null}
                  label={provider.name}
                  mode={mode}
                  loading={loadingAction === provider.id}
                  disabled={loadingAction !== null}
                  onClick={() => initiateOAuth(provider)}
                />
              )
            })}
          </div>

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

      {hasCredentialForm && (
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          {error && <FormError message={error} />}

          {mode === 'signup' && (
            <div className="space-y-2">
              <label htmlFor="inline-name" className="text-sm font-medium">
                {m.auth_name()}
              </label>
              <Input
                id="inline-name"
                type="text"
                placeholder={m.auth_jane_doe()}
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loadingAction !== null}
                autoComplete="name"
              />
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="inline-email" className="text-sm font-medium">
              {m.auth_email()}
            </label>
            <Input
              id="inline-email"
              type="email"
              placeholder={m.auth_email_placeholder()}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!!invitation || loadingAction !== null}
              className={invitation ? 'bg-muted' : ''}
              autoComplete="email"
            />
            {invitation && (
              <p className="text-xs text-muted-foreground">{m.auth_email_from_invitation()}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="inline-password" className="text-sm font-medium">
              {m.auth_password()}
            </label>
            <Input
              id="inline-password"
              type="password"
              placeholder={mode === 'signup' ? m.auth_password_placeholder_signup() : '••••••••'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loadingAction !== null}
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

          <Button type="submit" disabled={loadingAction !== null} className="w-full">
            {loadingAction === 'password' && (
              <ArrowPathIcon className="mr-2 h-4 w-4 animate-spin" />
            )}
            {loadingAction === 'password'
              ? mode === 'signup'
                ? m.auth_creating_account()
                : m.auth_signing_in()
              : mode === 'signup'
                ? m.auth_create_account()
                : m.auth_sign_in()}
          </Button>

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

          {onModeSwitch && (
            <p className="text-center text-sm text-muted-foreground">
              {mode === 'login' ? (
                <>
                  {m.auth_dont_have_account()}{' '}
                  <button
                    type="button"
                    onClick={() => onModeSwitch('signup')}
                    className="text-primary hover:underline font-medium"
                  >
                    {m.auth_sign_up()}
                  </button>
                </>
              ) : (
                <>
                  {m.auth_already_have_account()}{' '}
                  <button
                    type="button"
                    onClick={() => onModeSwitch('login')}
                    className="text-primary hover:underline font-medium"
                  >
                    {m.auth_sign_in()}
                  </button>
                </>
              )}
            </p>
          )}
        </form>
      )}

      {hasEmailForm && (
        <form onSubmit={handleEmailSubmit} className="space-y-4">
          {error && <FormError message={error} />}

          <div className="space-y-2">
            <label htmlFor="inline-otp-email" className="text-sm font-medium">
              {m.auth_email()}
            </label>
            <Input
              id="inline-otp-email"
              type="email"
              placeholder={m.auth_email_placeholder()}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!!invitation || loadingAction !== null}
              className={invitation ? 'bg-muted' : ''}
              autoComplete="email"
            />
            {invitation && (
              <p className="text-xs text-muted-foreground">{m.auth_email_from_invitation()}</p>
            )}
          </div>

          <Button type="submit" disabled={loadingAction !== null} className="w-full">
            {loadingAction === 'email' ? (
              <>
                <ArrowPathIcon className="mr-2 h-4 w-4 animate-spin" />
                {m.auth_sending_code()}
              </>
            ) : (
              m.auth_continue_with_email()
            )}
          </Button>

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

          {onModeSwitch && (
            <p className="text-center text-sm text-muted-foreground">
              {mode === 'login' ? (
                <>
                  {m.auth_dont_have_account()}{' '}
                  <button
                    type="button"
                    onClick={() => onModeSwitch('signup')}
                    className="text-primary hover:underline font-medium"
                  >
                    {m.auth_sign_up()}
                  </button>
                </>
              ) : (
                <>
                  {m.auth_already_have_account()}{' '}
                  <button
                    type="button"
                    onClick={() => onModeSwitch('login')}
                    className="text-primary hover:underline font-medium"
                  >
                    {m.auth_sign_in()}
                  </button>
                </>
              )}
            </p>
          )}
        </form>
      )}

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
            <label htmlFor="inline-code" className="text-sm font-medium">
              {m.auth_verification_code()}
            </label>
            <Input
              ref={codeInputRef}
              id="inline-code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder={m.auth_code_placeholder()}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              disabled={loadingAction !== null}
              className="text-center text-2xl tracking-widest"
              autoComplete="one-time-code"
            />
          </div>

          <Button
            type="submit"
            disabled={loadingAction !== null || code.length !== 6}
            className="w-full"
          >
            {loadingAction === 'code' ? (
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
              disabled={resendCooldown > 0 || loadingAction !== null}
              className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resendCooldown > 0
                ? m.auth_resend_code_in({ seconds: resendCooldown })
                : m.auth_resend_code()}
            </button>
          </div>
        </form>
      )}

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
            <label htmlFor="inline-forgot-email" className="text-sm font-medium">
              {m.auth_email()}
            </label>
            <Input
              id="inline-forgot-email"
              type="email"
              placeholder={m.auth_email_placeholder()}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loadingAction !== null}
              autoComplete="email"
            />
          </div>

          <Button
            type="submit"
            disabled={loadingAction !== null || !email.trim()}
            className="w-full"
          >
            {loadingAction === 'forgot' ? (
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

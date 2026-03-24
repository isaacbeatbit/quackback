import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import {
  ChatBubbleLeftRightIcon,
  SparklesIcon,
  BoltIcon,
  MapIcon,
} from '@heroicons/react/24/outline'
import { ArrowPathIcon } from '@heroicons/react/24/solid'
import { Button } from '@/components/ui/button'
import { getInviteBrandingFn } from '@/lib/server/functions/invitations'
import * as m from '@/paraglide/messages'

interface InviteBranding {
  workspaceName: string
  logoUrl: string | null
  inviterName: string | null
}

const FEATURES = [
  { icon: ChatBubbleLeftRightIcon, label: m.invite_feature_feedback_voting() },
  { icon: SparklesIcon, label: m.invite_feature_ai_insights() },
  { icon: BoltIcon, label: m.invite_feature_integrations() },
  { icon: MapIcon, label: m.invite_feature_roadmap_changelog() },
] as const

/** Extract an invitation ID (invite_...) from a callback URL path */
function parseInvitationId(callbackURL: string | undefined): string | null {
  if (!callbackURL) return null
  try {
    const path = new URL(callbackURL).pathname
    const match = path.match(/\/complete-signup\/(invite_[a-z0-9]+)/)
    return match?.[1] ?? null
  } catch {
    return null
  }
}

export const Route = createFileRoute('/verify-magic-link')({
  validateSearch: (search: Record<string, unknown>) => ({
    token: (search.token as string) || undefined,
    callbackURL: (search.callbackURL as string) || undefined,
    errorCallbackURL: (search.errorCallbackURL as string) || undefined,
  }),
  component: VerifyMagicLinkPage,
})

function VerifyMagicLinkPage() {
  const { token, callbackURL, errorCallbackURL } = Route.useSearch()

  if (!token) {
    return (
      <PageShell>
        <Card>
          <div className="text-destructive text-xl font-medium tracking-tight">
            {m.magic_invalid_link()}
          </div>
          <p className="mt-2 text-muted-foreground">{m.magic_invalid_link_description()}</p>
          <a href="/" className="mt-6 block">
            <Button variant="outline" className="w-full h-11">
              {m.error_go_home()}
            </Button>
          </a>
        </Card>
      </PageShell>
    )
  }

  const invitationId = parseInvitationId(callbackURL)

  if (invitationId) {
    return (
      <InvitationVerifyPage
        token={token}
        callbackURL={callbackURL}
        errorCallbackURL={errorCallbackURL}
        invitationId={invitationId}
      />
    )
  }

  return (
    <GenericVerifyPage
      token={token}
      callbackURL={callbackURL}
      errorCallbackURL={errorCallbackURL}
    />
  )
}

function InvitationVerifyPage({
  token,
  callbackURL,
  errorCallbackURL,
  invitationId,
}: {
  token: string
  callbackURL: string | undefined
  errorCallbackURL: string | undefined
  invitationId: string
}) {
  const [branding, setBranding] = useState<InviteBranding | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    getInviteBrandingFn({ data: invitationId })
      .then(setBranding)
      .catch(() => setBranding({ workspaceName: 'Quackback', logoUrl: null, inviterName: null }))
  }, [invitationId])

  function handleAccept() {
    setIsLoading(true)
    const verifyUrl = new URL('/api/auth/magic-link/verify', window.location.origin)
    verifyUrl.searchParams.set('token', token)
    if (callbackURL) verifyUrl.searchParams.set('callbackURL', callbackURL)
    if (errorCallbackURL) verifyUrl.searchParams.set('errorCallbackURL', errorCallbackURL)
    window.location.href = verifyUrl.toString()
  }

  return (
    <PageShell>
      <Card>
        {branding ? (
          <>
            <WorkspaceIdentity branding={branding} />
            <div className="mt-6 mb-6 h-px bg-border/50" />
            <h1 className="text-2xl font-bold tracking-tight">{m.invite_you_are_invited()}</h1>
            <p className="mt-2 text-muted-foreground">
              {branding.inviterName
                ? m.magic_invited_to_join({
                    inviterName: branding.inviterName,
                    workspaceName: branding.workspaceName,
                  })
                : m.magic_you_have_been_invited({ workspaceName: branding.workspaceName })}
            </p>
          </>
        ) : (
          <>
            <div className="h-8" />
            <h1 className="text-2xl font-bold tracking-tight">{m.invite_you_are_invited()}</h1>
            <p className="mt-2 text-muted-foreground">{m.magic_loading_invitation()}</p>
          </>
        )}
        <Button onClick={handleAccept} disabled={isLoading} className="mt-6 w-full h-11">
          {isLoading ? (
            <>
              <ArrowPathIcon className="mr-2 h-4 w-4 animate-spin" />
              {m.magic_setting_up()}
            </>
          ) : (
            m.magic_accept_invitation()
          )}
        </Button>
      </Card>
      <FeatureHighlights />
    </PageShell>
  )
}

function GenericVerifyPage({
  token,
  callbackURL,
  errorCallbackURL,
}: {
  token: string
  callbackURL: string | undefined
  errorCallbackURL: string | undefined
}) {
  function handleContinue() {
    const verifyUrl = new URL('/api/auth/magic-link/verify', window.location.origin)
    verifyUrl.searchParams.set('token', token)
    if (callbackURL) verifyUrl.searchParams.set('callbackURL', callbackURL)
    if (errorCallbackURL) verifyUrl.searchParams.set('errorCallbackURL', errorCallbackURL)
    window.location.href = verifyUrl.toString()
  }

  return (
    <PageShell>
      <Card>
        <h1 className="text-2xl font-bold tracking-tight">{m.magic_confirm_sign_in()}</h1>
        <p className="mt-2 text-muted-foreground">{m.magic_complete_sign_in()}</p>
        <Button onClick={handleContinue} className="mt-6 w-full h-11">
          {m.magic_continue()}
        </Button>
      </Card>
    </PageShell>
  )
}

function WorkspaceIdentity({ branding }: { branding: InviteBranding }) {
  return (
    <div className="flex items-center justify-center gap-2.5">
      {branding.logoUrl ? (
        <img
          src={branding.logoUrl}
          alt={branding.workspaceName}
          className="h-8 w-8 rounded-lg object-cover"
        />
      ) : (
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-semibold">
          {branding.workspaceName.charAt(0).toUpperCase()}
        </div>
      )}
      <span className="text-lg font-semibold">{branding.workspaceName}</span>
    </div>
  )
}

function FeatureHighlights() {
  return (
    <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
      {FEATURES.map(({ icon: Icon, label }) => (
        <div
          key={label}
          className="flex items-center gap-1.5 rounded-full border border-border/30 bg-card/50 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur-sm"
        >
          <Icon className="h-3.5 w-3.5 shrink-0" />
          {label}
        </div>
      ))}
    </div>
  )
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background overflow-hidden px-4">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04] dark:opacity-[0.07]"
        style={{
          backgroundImage: `
            radial-gradient(ellipse 80% 50% at 25% 15%, var(--primary), transparent),
            radial-gradient(ellipse 50% 80% at 80% 85%, var(--primary), transparent)
          `,
        }}
      />
      <div className="relative w-full max-w-md py-12">
        <div className="mb-8 flex items-center justify-center gap-2">
          <img src="/logo.png" alt="" className="h-6 w-6 rounded" />
          <span className="text-sm font-medium text-muted-foreground">{m.common_quackback()}</span>
        </div>
        {children}
      </div>
    </div>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-b from-card to-card/80 p-8 text-center backdrop-blur-sm"
      style={{
        boxShadow:
          '0 0 80px -20px oklch(0.886 0.176 86 / 0.12), 0 20px 40px -12px rgb(0 0 0 / 0.08)',
      }}
    >
      {children}
    </div>
  )
}

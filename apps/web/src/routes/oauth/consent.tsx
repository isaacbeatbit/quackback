import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Check, ExternalLink, Globe, ShieldCheck } from 'lucide-react'
import * as m from '@/paraglide/messages'

const searchSchema = z.object({
  client_id: z.string(),
  scope: z.string().optional(),
  redirect_uri: z.string().optional(),
  state: z.string().optional(),
  response_type: z.string().optional(),
  code_challenge: z.string().optional(),
  code_challenge_method: z.string().optional(),
  prompt: z.string().optional(),
  exp: z.union([z.string(), z.number()]).optional(),
  sig: z.string().optional(),
  resource: z.string().optional(),
})

export const Route = createFileRoute('/oauth/consent')({
  validateSearch: searchSchema,
  component: ConsentPage,
})

interface OAuthClientInfo {
  client_name?: string
  client_uri?: string
  logo_uri?: string
  policy_uri?: string
  tos_uri?: string
}

/** Returns true if the URL uses an http or https scheme. */
function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

const SCOPE_LABELS: Record<string, { label: string; description: string }> = {
  openid: {
    label: m.oauth_consent_scope_openid_label(),
    description: m.oauth_consent_scope_openid_description(),
  },
  profile: {
    label: m.oauth_consent_scope_profile_label(),
    description: m.oauth_consent_scope_profile_description(),
  },
  email: {
    label: m.oauth_consent_scope_email_label(),
    description: m.oauth_consent_scope_email_description(),
  },
  'read:feedback': {
    label: m.oauth_consent_scope_read_feedback_label(),
    description: m.oauth_consent_scope_read_feedback_description(),
  },
  'write:feedback': {
    label: m.oauth_consent_scope_write_feedback_label(),
    description: m.oauth_consent_scope_write_feedback_description(),
  },
  'write:changelog': {
    label: m.oauth_consent_scope_write_changelog_label(),
    description: m.oauth_consent_scope_write_changelog_description(),
  },
  offline_access: {
    label: m.oauth_consent_scope_offline_access_label(),
    description: m.oauth_consent_scope_offline_access_description(),
  },
}

/** Scopes that are standard OIDC plumbing — not worth showing to users */
const HIDDEN_SCOPES = new Set(['openid', 'profile', 'email', 'offline_access'])

function useClientInfo(clientId: string) {
  const [client, setClient] = useState<OAuthClientInfo | null>(null)

  useEffect(() => {
    fetch(`/api/auth/oauth2/public-client?client_id=${encodeURIComponent(clientId)}`, {
      credentials: 'include',
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setClient(data ?? {}))
      .catch(() => setClient({}))
  }, [clientId])

  return client
}

function ConsentPage() {
  const search = Route.useSearch()
  const client = useClientInfo(search.client_id)
  const allScopes: string[] = search.scope?.split(' ').filter(Boolean) ?? []
  const visibleScopes = allScopes.filter((s) => !HIDDEN_SCOPES.has(s))
  const [submitting, setSubmitting] = useState<'accept' | 'deny' | null>(null)

  const clientName = client?.client_name || m.oauth_consent_unknown_application()
  const clientDomain = (() => {
    if (!client?.client_uri || !isSafeUrl(client.client_uri)) return null
    try {
      return new URL(client.client_uri).hostname
    } catch {
      return null
    }
  })()

  async function handleConsent(accept: boolean) {
    setSubmitting(accept ? 'accept' : 'deny')
    try {
      const oauthQuery = window.location.search.replace(/^\?/, '')

      const response = await fetch('/api/auth/oauth2/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          accept,
          scope: search.scope,
          oauth_query: oauthQuery,
        }),
      })

      if (response.redirected) {
        window.location.href = response.url
        return
      }

      const data = await response.json()
      const redirectTo = data.url ?? data.uri ?? data.redirectUrl
      if (redirectTo) {
        window.location.href = redirectTo
      }
    } catch {
      setSubmitting(null)
    }
  }

  // Show nothing while loading client info to avoid flash
  if (client === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-muted animate-pulse" />
            <div className="mx-auto h-5 w-48 rounded bg-muted animate-pulse" />
            <div className="mx-auto mt-2 h-4 w-64 rounded bg-muted animate-pulse" />
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {/* Client identity */}
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            {client.logo_uri ? (
              <img
                src={client.logo_uri}
                alt={clientName}
                className="h-14 w-14 rounded-full object-cover"
              />
            ) : (
              <Globe className="h-7 w-7 text-muted-foreground" />
            )}
          </div>

          <CardTitle className="text-xl">{clientName}</CardTitle>

          <p className="mt-1 text-sm text-muted-foreground">{m.oauth_consent_wants_access()}</p>

          {clientDomain && (
            <p className="mt-1 text-xs text-muted-foreground">
              {client.client_uri ? (
                <a
                  href={client.client_uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 hover:underline"
                >
                  {clientDomain}
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                clientDomain
              )}
            </p>
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Permissions */}
          {visibleScopes.length > 0 && (
            <div className="rounded-lg border p-4 space-y-3">
              <p className="text-sm font-medium text-muted-foreground">
                {m.oauth_consent_permissions_intro({
                  clientName: client.client_name || m.oauth_consent_the_application(),
                })}
              </p>
              <ul className="space-y-2.5">
                {visibleScopes.map((s) => {
                  const scope = SCOPE_LABELS[s]
                  return (
                    <li key={s} className="flex items-start gap-2.5">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                      <div>
                        <p className="text-sm font-medium">{scope?.label ?? s}</p>
                        {scope?.description && (
                          <p className="text-xs text-muted-foreground">{scope.description}</p>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          {/* Authorization notice */}
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{m.oauth_consent_revocation_notice()}</p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              disabled={submitting !== null}
              onClick={() => handleConsent(false)}
            >
              {submitting === 'deny' ? m.oauth_consent_denying() : m.oauth_consent_deny()}
            </Button>
            <Button
              className="flex-1"
              disabled={submitting !== null}
              onClick={() => handleConsent(true)}
            >
              {submitting === 'accept'
                ? m.oauth_consent_authorizing()
                : m.oauth_consent_authorize()}
            </Button>
          </div>

          {/* Legal links */}
          {((client.tos_uri && isSafeUrl(client.tos_uri)) ||
            (client.policy_uri && isSafeUrl(client.policy_uri))) && (
            <p className="text-center text-xs text-muted-foreground">
              {m.oauth_consent_legal_prefix()}{' '}
              {client.tos_uri && isSafeUrl(client.tos_uri) && (
                <a
                  href={client.tos_uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-foreground"
                >
                  {m.oauth_consent_terms_of_service()}
                </a>
              )}
              {client.tos_uri &&
                isSafeUrl(client.tos_uri) &&
                client.policy_uri &&
                isSafeUrl(client.policy_uri) &&
                ` ${m.oauth_consent_legal_and()} `}
              {client.policy_uri && isSafeUrl(client.policy_uri) && (
                <a
                  href={client.policy_uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-foreground"
                >
                  {m.oauth_consent_privacy_policy()}
                </a>
              )}
              .
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

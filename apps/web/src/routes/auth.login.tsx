import { createFileRoute, redirect, Link } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { settingsQueries } from '@/lib/client/queries/settings'
import { PortalAuthForm } from '@/components/auth/portal-auth-form'
import { DEFAULT_PORTAL_CONFIG } from '@/lib/server/domains/settings'
import * as m from '@/paraglide/messages'

/**
 * Portal Login Page
 *
 * For portal users (visitors) to sign in using email OTP or OAuth.
 */
export const Route = createFileRoute('/auth/login')({
  loader: async ({ context }) => {
    // Settings already available from root context
    const { settings, queryClient } = context
    if (!settings) {
      throw redirect({ to: '/onboarding' })
    }

    // Pre-fetch portal config using React Query
    await queryClient.ensureQueryData(settingsQueries.publicPortalConfig())

    return {}
  },
  component: LoginPage,
})

function LoginPage() {
  Route.useLoaderData()

  // Read pre-fetched data from React Query cache
  const portalConfigQuery = useSuspenseQuery(settingsQueries.publicPortalConfig())
  const portalConfig = portalConfigQuery.data
  const authConfig = portalConfig.oauth ?? DEFAULT_PORTAL_CONFIG.oauth

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-8 px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold">{m.auth_welcome_back()}</h1>
          <p className="mt-2 text-muted-foreground">{m.auth_sign_in_to_account()}</p>
        </div>
        <PortalAuthForm
          mode="login"
          callbackUrl="/"
          authConfig={authConfig}
          customProviderNames={portalConfig.customProviderNames}
        />
        <p className="text-center text-sm text-muted-foreground">
          {m.auth_dont_have_account()}{' '}
          <Link to="/auth/signup" className="font-medium text-primary hover:underline">
            {m.auth_sign_up()}
          </Link>
        </p>
      </div>
    </div>
  )
}

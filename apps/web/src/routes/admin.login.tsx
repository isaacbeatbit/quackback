import { createFileRoute, redirect } from '@tanstack/react-router'
import { z } from 'zod'
import { PortalAuthForm } from '@/components/auth/portal-auth-form'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ExclamationCircleIcon } from '@heroicons/react/24/solid'
import * as m from '@/paraglide/messages'

// Error messages for login failures
const errorMessages: Record<string, string> = {
  invalid_token: m.admin_error_invalid_token(),
  token_expired: m.admin_error_token_expired(),
  not_team_member: m.admin_error_not_team_member(),
  oauth_method_not_allowed: m.admin_error_oauth_not_allowed(),
  password_method_not_allowed: m.admin_error_password_not_allowed(),
}

const searchSchema = z.object({
  callbackUrl: z.string().optional(),
  error: z.string().optional(),
})

/**
 * Admin Login Page
 *
 * For team members (admin, member) to sign in to the admin dashboard.
 * Supports email OTP and any configured OAuth providers.
 */
export const Route = createFileRoute('/admin/login')({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ callbackUrl: search.callbackUrl, error: search.error }),
  loader: async ({ deps, context }) => {
    // Settings already available from root context
    const { settings } = context
    if (!settings) {
      throw redirect({ to: '/onboarding' })
    }

    const { callbackUrl, error } = deps

    // Get error message if present
    const errorMessage = error && errorMessages[error]

    // Validate callbackUrl is a relative path to prevent open redirects
    const safeCallbackUrl =
      callbackUrl && callbackUrl.startsWith('/') && !callbackUrl.startsWith('//')
        ? callbackUrl
        : '/admin'

    // Auth config is already computed in TenantSettings (filtered by configured credentials)
    const authConfig = settings.publicAuthConfig.oauth
    const customProviderNames = settings.publicAuthConfig.customProviderNames

    return {
      errorMessage,
      safeCallbackUrl,
      authConfig,
      customProviderNames,
    }
  },
  component: AdminLoginPage,
})

function AdminLoginPage() {
  const { errorMessage, safeCallbackUrl, authConfig, customProviderNames } = Route.useLoaderData()

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-8 px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold">{m.admin_team_sign_in()}</h1>
          <p className="mt-2 text-muted-foreground">{m.admin_sign_in_dashboard()}</p>
        </div>
        {errorMessage && (
          <Alert variant="destructive">
            <ExclamationCircleIcon className="h-4 w-4" />
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}
        <PortalAuthForm
          mode="login"
          callbackUrl={safeCallbackUrl}
          authConfig={authConfig}
          customProviderNames={customProviderNames}
        />
      </div>
    </div>
  )
}

import { createFileRoute, Link } from '@tanstack/react-router'
import { z } from 'zod'
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid'
import {
  processUnsubscribeTokenFn,
  type UnsubscribeResult,
} from '@/lib/server/functions/subscriptions'
import * as m from '@/paraglide/messages'

const searchSchema = z.object({
  token: z.string().optional(),
})

export const Route = createFileRoute('/unsubscribe')({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ token: search.token }),
  loader: async ({ deps }): Promise<UnsubscribeResult | { success: false; error: 'missing' }> => {
    if (!deps.token) {
      return { success: false, error: 'missing' }
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(deps.token)) {
      return { success: false, error: 'invalid' }
    }

    return processUnsubscribeTokenFn({ data: { token: deps.token } })
  },
  component: UnsubscribePage,
})

function UnsubscribePage() {
  const result = Route.useLoaderData()

  if (result.success) {
    return <SuccessView result={result} />
  }

  return <ErrorView error={result.error || 'invalid'} />
}

function SuccessView({ result }: { result: UnsubscribeResult }) {
  const actionText = getActionText(result.action)

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <CheckCircleIcon className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-xl font-semibold text-foreground">{actionText.title}</h1>
          <p className="text-sm text-muted-foreground">{actionText.message}</p>
          {result.postTitle && (
            <p className="text-sm text-muted-foreground mt-2">
              {m.unsubscribe_post_label({ title: result.postTitle })}
            </p>
          )}
        </div>

        <div className="flex justify-center pt-4">
          {result.boardSlug && result.postId ? (
            <Link
              to="/b/$slug/posts/$postId"
              params={{ slug: result.boardSlug, postId: result.postId }}
              className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              {m.unsubscribe_view_post()}
            </Link>
          ) : (
            <Link
              to="/"
              className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              {m.error_go_home()}
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

function ErrorView({ error }: { error: string }) {
  const { title, message } = getErrorContent(error)

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <XCircleIcon className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-xl font-semibold text-foreground">{title}</h1>
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>

        <div className="flex justify-center pt-4">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            {m.error_go_home()}
          </Link>
        </div>
      </div>
    </div>
  )
}

function getActionText(action?: string): { title: string; message: string } {
  switch (action) {
    case 'unsubscribe_post':
      return {
        title: m.unsubscribe_unsubscribed_title(),
        message: m.unsubscribe_unsubscribed_message(),
      }
    case 'mute_post':
      return {
        title: m.unsubscribe_muted_title(),
        message: m.unsubscribe_muted_message(),
      }
    case 'unsubscribe_all':
      return {
        title: m.unsubscribe_all_disabled_title(),
        message: m.unsubscribe_all_disabled_message(),
      }
    default:
      return {
        title: m.unsubscribe_success_title(),
        message: m.unsubscribe_success_message(),
      }
  }
}

function getErrorContent(error: string): { title: string; message: string } {
  switch (error) {
    case 'missing':
      return {
        title: m.unsubscribe_missing_title(),
        message: m.unsubscribe_missing_message(),
      }
    case 'invalid':
    case 'expired':
    case 'used':
      return {
        title: m.unsubscribe_expired_title(),
        message: m.unsubscribe_expired_message(),
      }
    case 'failed':
      return {
        title: m.unsubscribe_failed_title(),
        message: m.unsubscribe_failed_message(),
      }
    default:
      return {
        title: m.unsubscribe_invalid_title(),
        message: m.unsubscribe_invalid_message(),
      }
  }
}

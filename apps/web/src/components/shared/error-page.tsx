import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { cn } from '@/lib/shared/utils'
import { Button } from '@/components/ui/button'
import * as m from '@/paraglide/messages'
import { localizeHref } from '@/paraglide/runtime'

interface ErrorPageProps {
  error: Error
  reset?: () => void
  fullPage?: boolean
}

export function DefaultErrorPage({ error, reset, fullPage = true }: ErrorPageProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-center px-4',
        fullPage ? 'min-h-screen' : 'min-h-[400px]'
      )}
    >
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
          <ExclamationTriangleIcon className="h-7 w-7 text-destructive" />
        </div>

        <h1 className="text-2xl font-semibold tracking-tight">{m.error_something_went_wrong()}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{m.error_unexpected()}</p>

        {error.message && (
          <div className="mt-4 rounded-md border bg-muted/50 px-4 py-3 text-left">
            <p className="text-sm text-muted-foreground break-words">{error.message}</p>
          </div>
        )}

        <div className="mt-6 flex items-center justify-center gap-3">
          {reset && (
            <Button onClick={reset} variant="default">
              {m.error_try_again()}
            </Button>
          )}
          <Button variant="outline" asChild>
            <a href={localizeHref('/')}>{m.error_go_home()}</a>
          </Button>
        </div>
      </div>
    </div>
  )
}

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <h1 className="text-6xl font-bold tracking-tight text-muted-foreground/30">404</h1>
        <h2 className="mt-4 text-2xl font-semibold tracking-tight">{m.error_page_not_found()}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{m.error_page_not_found_description()}</p>

        <div className="mt-6">
          <Button variant="outline" asChild>
            <a href={localizeHref('/')}>{m.error_go_home()}</a>
          </Button>
        </div>
      </div>
    </div>
  )
}

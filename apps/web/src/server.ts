import handler, { createServerEntry } from '@tanstack/react-start/server-entry'
import { paraglideMiddleware } from './paraglide/server'
import { logStartupBanner } from '@/lib/server/startup'

logStartupBanner()

export default createServerEntry({
  fetch(request) {
    return paraglideMiddleware(request, ({ request: localizedRequest }) =>
      handler.fetch(localizedRequest)
    )
  },
})

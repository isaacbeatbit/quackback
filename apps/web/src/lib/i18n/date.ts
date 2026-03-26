import { formatDistanceToNow } from 'date-fns'
import { enUS, es } from 'date-fns/locale'
import { getLocale } from '@/paraglide/runtime'

export function getDateFnsLocale() {
  return getLocale() === 'es' ? es : enUS
}

export function formatRelativeTime(date: Date | string | null | undefined): string {
  if (!date) return ''

  const resolvedDate = typeof date === 'string' ? new Date(date) : date
  if (isNaN(resolvedDate.getTime())) return ''

  return formatDistanceToNow(resolvedDate, {
    addSuffix: true,
    locale: getDateFnsLocale(),
  })
}

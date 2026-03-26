import * as m from '@/paraglide/messages'

function normalizeStatusName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function localizeStatusName(name: string): string {
  switch (normalizeStatusName(name)) {
    case 'open':
      return m.status_open()
    case 'under review':
      return m.status_under_review()
    case 'planned':
      return m.status_planned()
    case 'in progress':
      return m.status_in_progress()
    case 'closed':
      return m.status_closed()
    case 'complete':
    case 'completed':
      return m.status_complete()
    default:
      return name
  }
}

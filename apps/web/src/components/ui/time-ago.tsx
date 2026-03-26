import { useEffect, useState } from 'react'
import { formatRelativeTime } from '@/lib/i18n/date'

interface TimeAgoProps {
  date: Date | string
  className?: string
}

function getTimeAgo(date: Date | string | null | undefined): string {
  return formatRelativeTime(date)
}

export function TimeAgo({ date, className }: TimeAgoProps) {
  // Initialize with computed value for SSR
  const [timeAgo, setTimeAgo] = useState<string>(() => getTimeAgo(date))

  useEffect(() => {
    // Update immediately in case server/client time differs slightly
    setTimeAgo(getTimeAgo(date))

    // Update every minute
    const interval = setInterval(() => {
      setTimeAgo(getTimeAgo(date))
    }, 60000)

    return () => clearInterval(interval)
  }, [date])

  return <span className={className}>{timeAgo}</span>
}

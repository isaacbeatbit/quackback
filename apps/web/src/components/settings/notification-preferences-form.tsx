import { useState, useEffect, useCallback } from 'react'
import { Switch } from '@/components/ui/switch'
import { ArrowPathIcon } from '@heroicons/react/24/solid'
import {
  getNotificationPreferencesFn,
  updateNotificationPreferencesFn,
} from '@/lib/server/functions/user'
import * as m from '@/paraglide/messages'

interface Preferences {
  emailStatusChange: boolean
  emailNewComment: boolean
}

export function NotificationPreferencesForm() {
  const [preferences, setPreferences] = useState<Preferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Fetch preferences on mount
  useEffect(() => {
    async function fetchPreferences() {
      try {
        const result = await getNotificationPreferencesFn()
        setPreferences(result as Preferences)
      } catch (err) {
        setError(err instanceof Error ? err.message : m.settings_notifications_load_failed())
      } finally {
        setLoading(false)
      }
    }
    fetchPreferences()
  }, [])

  // Update a single preference
  const updatePreference = useCallback(
    async (key: keyof Preferences, value: boolean) => {
      if (!preferences) return

      setSaving(key)
      setError(null)

      // Optimistic update
      setPreferences((prev) => (prev ? { ...prev, [key]: value } : prev))

      try {
        const result = await updateNotificationPreferencesFn({
          data: {
            [key]: value,
          },
        })

        setPreferences(result as Preferences)
      } catch (err) {
        // Revert on error
        setPreferences((prev) => (prev ? { ...prev, [key]: !value } : prev))
        setError(err instanceof Error ? err.message : m.settings_notifications_save_failed())
      } finally {
        setSaving(null)
      }
    },
    [preferences]
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <ArrowPathIcon className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error && !preferences) {
    return (
      <div className="rounded-lg bg-destructive/10 p-4">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    )
  }

  if (!preferences) {
    return null
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg bg-destructive/10 p-3">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Status change emails */}
      <div className="flex items-center justify-between py-2">
        <div className="space-y-0.5">
          <p className="text-sm font-medium">{m.settings_notifications_status_updates()}</p>
          <p className="text-xs text-muted-foreground">
            {m.settings_notifications_status_updates_description()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saving === 'emailStatusChange' && (
            <ArrowPathIcon className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
          <Switch
            checked={preferences.emailStatusChange}
            onCheckedChange={(checked) => updatePreference('emailStatusChange', checked)}
            disabled={saving !== null}
          />
        </div>
      </div>

      {/* New comment emails */}
      <div className="flex items-center justify-between py-2">
        <div className="space-y-0.5">
          <p className="text-sm font-medium">{m.settings_notifications_new_comments()}</p>
          <p className="text-xs text-muted-foreground">
            {m.settings_notifications_new_comments_description()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saving === 'emailNewComment' && (
            <ArrowPathIcon className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
          <Switch
            checked={preferences.emailNewComment}
            onCheckedChange={(checked) => updatePreference('emailNewComment', checked)}
            disabled={saving !== null}
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground pt-2">
        {m.settings_notifications_subscription_hint()}
      </p>
    </div>
  )
}

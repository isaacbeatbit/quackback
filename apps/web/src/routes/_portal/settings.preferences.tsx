import { createFileRoute } from '@tanstack/react-router'
import { Cog6ToothIcon } from '@heroicons/react/24/solid'
import { PageHeader } from '@/components/shared/page-header'
import { ThemeSwitcher } from '@/components/theme-switcher'
import { NotificationPreferencesForm } from '@/components/settings/notification-preferences-form'
import * as m from '@/paraglide/messages'

export const Route = createFileRoute('/_portal/settings/preferences')({
  component: PreferencesPage,
})

function PreferencesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        icon={Cog6ToothIcon}
        title={m.settings_preferences()}
        description={m.portal_preferences_page_description()}
        animate
      />

      {/* Appearance */}
      <div
        className="rounded-xl border border-border/50 bg-card p-6 shadow-sm animate-in fade-in duration-200 fill-mode-backwards"
        style={{ animationDelay: '75ms' }}
      >
        <h2 className="font-medium mb-1">{m.settings_section_appearance()}</h2>
        <p className="text-sm text-muted-foreground mb-4">
          {m.portal_preferences_appearance_description()}
        </p>
        <div className="space-y-3">
          <p className="text-sm font-medium">{m.portal_preferences_theme_title()}</p>
          <ThemeSwitcher />
        </div>
      </div>

      {/* Notifications */}
      <div
        className="rounded-xl border border-border/50 bg-card p-6 shadow-sm animate-in fade-in duration-200 fill-mode-backwards"
        style={{ animationDelay: '150ms' }}
      >
        <h2 className="font-medium mb-1">{m.portal_preferences_email_notifications_title()}</h2>
        <p className="text-sm text-muted-foreground mb-4">
          {m.portal_preferences_email_notifications_description()}
        </p>
        <NotificationPreferencesForm />
      </div>
    </div>
  )
}

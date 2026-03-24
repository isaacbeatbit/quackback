import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { PortalAuthFormInline } from './portal-auth-form-inline'
import { useAuthPopover } from './auth-popover-context'
import { useAuthBroadcast } from '@/lib/client/hooks/use-auth-broadcast'
import * as m from '@/paraglide/messages'

interface OrgAuthConfig {
  found: boolean
  oauth: Record<string, boolean | undefined>
  openSignup?: boolean
  customProviderNames?: Record<string, string>
}

interface AuthDialogProps {
  authConfig?: OrgAuthConfig | null
}

/**
 * Auth Dialog Component
 *
 * A modal dialog that contains the inline OTP auth form.
 * Opens when triggered via useAuthPopover context.
 * Listens for auth success via BroadcastChannel.
 */
export function AuthDialog({ authConfig }: AuthDialogProps) {
  const { isOpen, mode, closeAuthPopover, setMode, onAuthSuccess } = useAuthPopover()

  // Listen for auth success broadcasts from popup windows
  // The onAuthSuccess callback handles session updates via router.invalidate()
  useAuthBroadcast({
    onSuccess: onAuthSuccess,
    enabled: isOpen,
  })

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeAuthPopover()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === 'login' ? m.auth_welcome_back() : m.auth_create_account()}
          </DialogTitle>
          <DialogDescription>
            {mode === 'login'
              ? m.auth_sign_in_vote_comment()
              : m.auth_sign_up_vote_comment_feedback()}
          </DialogDescription>
        </DialogHeader>
        <PortalAuthFormInline mode={mode} authConfig={authConfig} onModeSwitch={setMode} />
      </DialogContent>
    </Dialog>
  )
}

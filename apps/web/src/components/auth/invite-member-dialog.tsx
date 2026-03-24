import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { CheckCircleIcon, CheckIcon, ClipboardDocumentIcon } from '@heroicons/react/24/solid'
import { inviteSchema, type InviteInput } from '@/lib/shared/schemas/auth'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { FormError } from '@/components/shared/form-error'
import { useCopyToClipboard } from '@/lib/client/hooks/use-copy-to-clipboard'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { sendInvitationFn } from '@/lib/server/functions/admin'
import * as m from '@/paraglide/messages'

function InviteLinkView({
  inviteLink,
  email,
  onClose,
}: {
  inviteLink: string
  email: string
  onClose: () => void
}) {
  const { copied, copy } = useCopyToClipboard()

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {m.invite_member_no_email_delivery({ email })}
      </p>

      <div className="rounded-lg border bg-muted/50 p-3">
        <code className="block break-all font-mono text-xs text-muted-foreground leading-relaxed">
          {inviteLink}
        </code>
      </div>

      <div className="flex gap-2">
        <Button className="flex-1" onClick={() => copy(inviteLink)}>
          {copied ? (
            <>
              <CheckIcon className="h-4 w-4" />
              {m.invite_member_copied()}
            </>
          ) : (
            <>
              <ClipboardDocumentIcon className="h-4 w-4" />
              {m.invite_member_copy_link()}
            </>
          )}
        </Button>
        <Button variant="outline" onClick={onClose}>
          {m.invite_member_done()}
        </Button>
      </div>
    </div>
  )
}

interface InviteMemberDialogProps {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function InviteMemberDialog({ open, onClose, onSuccess }: InviteMemberDialogProps) {
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [inviteLink, setInviteLink] = useState<string | null>(null)

  const form = useForm<InviteInput>({
    resolver: standardSchemaResolver(inviteSchema),
    defaultValues: {
      email: '',
      name: '',
      role: 'member',
    },
  })

  async function onSubmit(data: InviteInput) {
    setError('')

    try {
      const result = await sendInvitationFn({ data })

      setSuccess(true)
      onSuccess?.()

      if (result.emailSent === false && result.inviteLink) {
        setInviteLink(result.inviteLink)
      } else {
        form.reset()
        setTimeout(() => {
          setSuccess(false)
          onClose()
        }, 2000)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : m.invite_member_failed())
    }
  }

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) {
      form.reset()
      setError('')
      setSuccess(false)
      setInviteLink(null)
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{m.invite_member_title()}</DialogTitle>
        </DialogHeader>

        {success ? (
          inviteLink ? (
            <InviteLinkView
              inviteLink={inviteLink}
              email={form.getValues('email')}
              onClose={() => handleOpenChange(false)}
            />
          ) : (
            <div className="py-8 flex flex-col items-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-4">
                <CheckCircleIcon className="h-6 w-6 text-primary" />
              </div>
              <div className="text-lg font-semibold text-foreground">{m.invite_member_sent()}</div>
              <p className="mt-2 text-sm text-muted-foreground text-center">
                {m.invite_member_sent_description({ email: form.getValues('email') })}
              </p>
            </div>
          )
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {error && <FormError message={error} />}

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{m.invite_member_name_label()}</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder={m.invite_member_name_placeholder()}
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{m.invite_member_email_label()}</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder={m.invite_member_email_placeholder()}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{m.invite_member_role_label()}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="member">{m.invite_member_role_member()}</SelectItem>
                        <SelectItem value="admin">{m.invite_member_role_admin()}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose}>
                  {m.invite_member_cancel()}
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? m.invite_member_sending() : m.invite_member_send()}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  )
}

'use client'

import { Suspense } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { AuthProviderCredentialsForm } from './auth-provider-credentials-form'
import type { PlatformCredentialField } from '@/lib/server/integrations/types'
import * as m from '@/paraglide/messages'

interface AuthProviderCredentialsDialogProps {
  credentialType: string
  providerId: string
  providerName: string
  fields: PlatformCredentialField[]
  helpUrl?: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

function FormSkeleton({ fieldCount }: { fieldCount: number }) {
  return (
    <div className="min-h-[200px] space-y-4">
      <div className="space-y-3">
        {Array.from({ length: fieldCount }, (_, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-9 w-full" />
          </div>
        ))}
      </div>
      <Skeleton className="h-8 w-16" />
    </div>
  )
}

export function AuthProviderCredentialsDialog({
  credentialType,
  providerId,
  providerName,
  fields,
  helpUrl,
  open,
  onOpenChange,
}: AuthProviderCredentialsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{m.dialog_configure_integration_title({ name: providerName })}</DialogTitle>
          <DialogDescription>
            {m.dialog_configure_auth_provider_description({ name: providerName })}
            {helpUrl && (
              <>
                {' '}
                <a
                  href={helpUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {m.dialog_open_developer_console({ name: providerName })}
                </a>
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <Suspense fallback={<FormSkeleton fieldCount={fields.length || 2} />}>
          <AuthProviderCredentialsForm
            credentialType={credentialType}
            providerId={providerId}
            providerName={providerName}
            fields={fields}
            onSaved={() => onOpenChange(false)}
          />
        </Suspense>
      </DialogContent>
    </Dialog>
  )
}

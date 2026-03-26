'use client'

import { useState } from 'react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { adminQueries } from '@/lib/client/queries/admin'
import { useSavePlatformCredentials, useDeletePlatformCredentials } from '@/lib/client/mutations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { PlatformCredentialField } from '@/lib/server/integrations/types'
import * as m from '@/paraglide/messages'

interface PlatformCredentialsFormProps {
  integrationType: string
  fields: PlatformCredentialField[]
  onSaved?: () => void
}

function getLocalizedPlatformCredentialField(
  integrationType: string,
  field: PlatformCredentialField
): PlatformCredentialField {
  switch (integrationType) {
    case 'gitlab':
      if (field.key === 'clientId') {
        return { ...field, label: m.platform_credentials_application_id_label() }
      }
      if (field.key === 'clientSecret') {
        return { ...field, label: m.platform_credentials_secret_label() }
      }
      return field
    case 'notion':
      if (field.key === 'clientId') {
        return { ...field, label: m.platform_credentials_oauth_client_id_label() }
      }
      if (field.key === 'clientSecret') {
        return { ...field, label: m.platform_credentials_oauth_client_secret_label() }
      }
      return field
    case 'salesforce':
      if (field.key === 'clientId') {
        return { ...field, label: m.platform_credentials_consumer_key_label() }
      }
      if (field.key === 'clientSecret') {
        return { ...field, label: m.platform_credentials_consumer_secret_label() }
      }
      return field
    case 'trello':
      if (field.key === 'clientId') {
        return { ...field, label: m.platform_credentials_api_key_label() }
      }
      if (field.key === 'clientSecret') {
        return { ...field, label: m.platform_credentials_api_secret_label() }
      }
      return field
    case 'discord':
      if (field.key === 'botToken') {
        return { ...field, label: m.platform_credentials_bot_token_label() }
      }
      break
    case 'slack':
      if (field.key === 'signingSecret') {
        return {
          ...field,
          label: m.platform_credentials_signing_secret_label(),
          helpText: m.platform_credentials_signing_secret_help(),
        }
      }
      break
    default:
      break
  }

  if (field.key === 'clientId') {
    return { ...field, label: m.platform_credentials_client_id_label() }
  }
  if (field.key === 'clientSecret') {
    return { ...field, label: m.platform_credentials_client_secret_label() }
  }

  return field
}

export function PlatformCredentialsForm({
  integrationType,
  fields,
  onSaved,
}: PlatformCredentialsFormProps) {
  const credentialsQuery = useSuspenseQuery(adminQueries.platformCredentials(integrationType))
  const isConfigured = credentialsQuery.data.configured
  const maskedFields = credentialsQuery.data.fields

  const [isEditing, setIsEditing] = useState(false)
  const [values, setValues] = useState<Record<string, string>>({})

  const localizedFields = fields.map((field) =>
    getLocalizedPlatformCredentialField(integrationType, field)
  )

  const saveMutation = useSavePlatformCredentials()
  const deleteMutation = useDeletePlatformCredentials()

  const handleStartEdit = () => {
    setValues({})
    setIsEditing(true)
  }

  const handleCancel = () => {
    setValues({})
    setIsEditing(false)
  }

  const handleSave = () => {
    saveMutation.mutate(
      { integrationType, credentials: values },
      {
        onSuccess: () => {
          setIsEditing(false)
          setValues({})
          onSaved?.()
        },
      }
    )
  }

  const handleDelete = () => {
    deleteMutation.mutate(
      { integrationType },
      {
        onSuccess: () => {
          setValues({})
        },
      }
    )
  }

  const allFieldsFilled = localizedFields.every((f) => values[f.key]?.trim())

  // Show masked values when configured and not editing
  if (isConfigured && !isEditing) {
    return (
      <div className="space-y-4">
        <div className="space-y-3">
          {localizedFields.map((field) => (
            <div key={field.key}>
              <Label className="text-sm font-medium text-muted-foreground">{field.label}</Label>
              <div className="mt-1 rounded-md border border-border/50 bg-muted/30 px-3 py-2 text-sm font-mono text-muted-foreground">
                {maskedFields?.[field.key] ?? '—'}
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleStartEdit}>
            {m.platform_credentials_update()}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="text-destructive hover:text-destructive"
          >
            {deleteMutation.isPending
              ? m.platform_credentials_removing()
              : m.platform_credentials_remove()}
          </Button>
        </div>
      </div>
    )
  }

  // Show input form when not configured or editing
  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {localizedFields.map((field) => (
          <div key={field.key}>
            <Label htmlFor={`cred-${field.key}`} className="text-sm font-medium">
              {field.label}
            </Label>
            <Input
              id={`cred-${field.key}`}
              type={field.sensitive ? 'password' : 'text'}
              placeholder={field.placeholder ?? ''}
              value={values[field.key] ?? ''}
              onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
              className="mt-1"
            />
            {field.helpText && (
              <p className="mt-1 text-xs text-muted-foreground">{field.helpText}</p>
            )}
            {field.helpUrl && (
              <a
                href={field.helpUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-block text-xs text-primary hover:underline"
              >
                {m.platform_credentials_get_from_provider()}
              </a>
            )}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={handleSave}
          disabled={!allFieldsFilled || saveMutation.isPending}
        >
          {saveMutation.isPending ? m.common_saving() : m.common_save_changes()}
        </Button>
        {isEditing && (
          <Button variant="outline" size="sm" onClick={handleCancel}>
            {m.platform_credentials_cancel()}
          </Button>
        )}
      </div>
      {saveMutation.isError && (
        <p className="text-sm text-destructive">
          {saveMutation.error?.message ?? m.platform_credentials_save_failed()}
        </p>
      )}
    </div>
  )
}

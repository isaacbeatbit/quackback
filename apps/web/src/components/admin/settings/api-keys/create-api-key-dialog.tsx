'use client'

import { useState, useTransition } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { createApiKeyFn } from '@/lib/server/functions/api-keys'
import type { ApiKey } from '@/lib/server/domains/api-keys'
import * as m from '@/paraglide/messages'

interface CreateApiKeyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onKeyCreated: (key: ApiKey, plainTextKey: string) => void
}

export function CreateApiKeyDialog({ open, onOpenChange, onKeyCreated }: CreateApiKeyDialogProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [isPending, startTransition] = useTransition()
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError(m.api_keys_create_name_required())
      return
    }

    try {
      const result = await createApiKeyFn({ data: { name: name.trim() } })

      // Invalidate queries to refresh the list
      startTransition(() => {
        queryClient.invalidateQueries({ queryKey: ['admin', 'api-keys'] })
        router.invalidate()
      })

      // Reset form and notify parent
      setName('')
      onKeyCreated(result.apiKey, result.plainTextKey)
    } catch (err) {
      console.error('Failed to create API key:', err)
      setError(err instanceof Error ? err.message : m.api_keys_create_failed())
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setName('')
      setError(null)
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{m.api_keys_create_title()}</DialogTitle>
          <DialogDescription>{m.api_keys_create_description()}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">{m.api_keys_name_label()}</Label>
              <Input
                id="name"
                placeholder={m.api_keys_name_placeholder()}
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isPending}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">{m.api_keys_name_help()}</p>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              {m.common_cancel()}
            </Button>
            <Button type="submit" disabled={isPending || !name.trim()}>
              {isPending ? m.api_keys_creating() : m.api_keys_create_button()}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

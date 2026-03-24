import { useState, useRef } from 'react'
import { toast } from 'sonner'
import { CameraIcon, ArrowPathIcon, TrashIcon } from '@heroicons/react/24/solid'
import { useSuspenseQuery } from '@tanstack/react-query'
import type { UserId } from '@quackback/ids'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ImageCropper } from '@/components/ui/image-cropper'
import { authClient } from '@/lib/server/auth/client'
import { useRouter } from '@tanstack/react-router'
import { updateProfileNameFn } from '@/lib/server/functions/user'
import { useUploadAvatar, useDeleteAvatar } from '@/lib/client/mutations/avatar'
import { settingsQueries } from '@/lib/client/queries/settings'
import { PasswordForm } from '@/components/settings/password-form'
import * as m from '@/paraglide/messages'

interface ProfileFormProps {
  user: {
    id: string
    name: string
    email: string | null
  }
}

export function ProfileForm({ user }: ProfileFormProps) {
  const router = useRouter()
  const userId = user.id as UserId

  // Avatar state from React Query
  const { data: profileData } = useSuspenseQuery(settingsQueries.userProfile(userId))
  const { avatarUrl, hasCustomAvatar } = profileData

  // Avatar mutations
  const uploadMutation = useUploadAvatar(userId)
  const deleteMutation = useDeleteAvatar(userId)

  const [name, setName] = useState(user.name)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Cropper state
  const [showCropper, setShowCropper] = useState(false)
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null)

  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const avatarSrc = avatarUrl || undefined

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      toast.error(m.settings_profile_avatar_invalid_file_type())
      return
    }

    // Validate file size (5MB) - basic check before cropping
    if (file.size > 5 * 1024 * 1024) {
      toast.error(m.settings_profile_avatar_file_too_large())
      return
    }

    // Create URL for cropper and show modal
    const imageUrl = URL.createObjectURL(file)
    setCropImageSrc(imageUrl)
    setShowCropper(true)

    // Reset file input for re-selection
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleCropComplete = (croppedBlob: Blob) => {
    if (cropImageSrc) {
      URL.revokeObjectURL(cropImageSrc)
      setCropImageSrc(null)
    }

    uploadMutation.mutate(croppedBlob, {
      onSuccess: () => {
        router.invalidate()
        toast.success(m.settings_profile_avatar_updated())
      },
      onError: (error) => {
        toast.error(
          error instanceof Error ? error.message : m.settings_profile_avatar_upload_failed()
        )
      },
    })
  }

  const handleCropperClose = (open: boolean) => {
    if (!open && cropImageSrc) {
      URL.revokeObjectURL(cropImageSrc)
      setCropImageSrc(null)
    }
    setShowCropper(open)
  }

  const handleDeleteAvatar = () => {
    deleteMutation.mutate(undefined, {
      onSuccess: () => {
        router.invalidate()
        toast.success(m.settings_profile_avatar_removed())
      },
      onError: (error) => {
        toast.error(
          error instanceof Error ? error.message : m.settings_profile_avatar_remove_failed()
        )
      },
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (name.trim().length < 2) {
      toast.error(m.settings_profile_name_min_length())
      return
    }

    if (name === user.name) {
      toast.info(m.settings_profile_no_changes())
      return
    }

    setIsSubmitting(true)

    try {
      await updateProfileNameFn({ data: { name: name.trim() } })

      // Update better-auth session with new name
      await authClient.updateUser(
        { name: name.trim() },
        {
          onSuccess: () => {
            router.invalidate()
          },
        }
      )
      toast.success(m.settings_profile_updated())
    } catch (error) {
      toast.error(error instanceof Error ? error.message : m.settings_profile_update_failed())
    } finally {
      setIsSubmitting(false)
    }
  }

  const isUploadingAvatar = uploadMutation.isPending
  const isDeletingAvatar = deleteMutation.isPending

  return (
    <div className="space-y-6">
      {/* Avatar Section */}
      <div className="rounded-xl border border-border/50 bg-card p-6 shadow-sm">
        <h2 className="font-medium mb-1">{m.settings_profile_avatar_title()}</h2>
        <p className="text-sm text-muted-foreground mb-4">
          {m.settings_profile_avatar_description()}
        </p>
        <div className="flex items-center gap-4">
          <div className="relative group">
            <Avatar className="h-16 w-16">
              <AvatarImage src={avatarSrc} alt={name} />
              <AvatarFallback className="text-lg">{initials}</AvatarFallback>
            </Avatar>
            {isUploadingAvatar && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                <ArrowPathIcon className="h-6 w-6 animate-spin text-white" />
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleAvatarClick}
              disabled={isUploadingAvatar}
            >
              {isUploadingAvatar ? (
                <>
                  <ArrowPathIcon className="h-4 w-4 animate-spin mr-2" />
                  {m.settings_profile_avatar_uploading()}
                </>
              ) : (
                <>
                  <CameraIcon className="h-4 w-4 mr-2" />
                  {m.settings_profile_avatar_change()}
                </>
              )}
            </Button>
            {hasCustomAvatar && (
              <Button
                type="button"
                variant="outline"
                onClick={handleDeleteAvatar}
                disabled={isDeletingAvatar}
                className="text-destructive hover:text-destructive"
              >
                {isDeletingAvatar ? (
                  <ArrowPathIcon className="h-4 w-4 animate-spin" />
                ) : (
                  <TrashIcon className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      </div>

      {/* Personal Information */}
      <form onSubmit={handleSubmit}>
        <div className="rounded-xl border border-border/50 bg-card p-6 shadow-sm">
          <h2 className="font-medium mb-1">{m.settings_profile_info_title()}</h2>
          <p className="text-sm text-muted-foreground mb-4">
            {m.settings_profile_info_description()}
          </p>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium">
                  {m.settings_profile_full_name()}
                </label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  defaultValue={user.email ?? ''}
                  disabled
                  placeholder={m.settings_profile_no_email()}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <ArrowPathIcon className="h-4 w-4 animate-spin mr-2" />
                    {m.settings_profile_saving()}
                  </>
                ) : (
                  m.settings_profile_save_changes()
                )}
              </Button>
            </div>
          </div>
        </div>
      </form>

      {/* Password */}
      <PasswordForm />

      {/* Image Cropper Modal */}
      {cropImageSrc && (
        <ImageCropper
          imageSrc={cropImageSrc}
          open={showCropper}
          onOpenChange={handleCropperClose}
          onCropComplete={handleCropComplete}
        />
      )}
    </div>
  )
}

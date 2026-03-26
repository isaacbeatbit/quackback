import { useState } from 'react'
import { useRouter, useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { createBoardSchema, type CreateBoardOutput } from '@/lib/shared/schemas/boards'
import { useCreateBoard } from '@/lib/client/mutations'
import { FormError } from '@/components/shared/form-error'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { PlusIcon } from '@heroicons/react/24/solid'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import * as m from '@/paraglide/messages'

interface CreateBoardDialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  trigger?: React.ReactNode
}

export function CreateBoardDialog({
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  trigger,
}: CreateBoardDialogProps = {}) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isOpen = controlledOpen ?? internalOpen
  const setIsOpen = controlledOnOpenChange ?? setInternalOpen
  const router = useRouter()
  const navigate = useNavigate()
  const mutation = useCreateBoard()

  const form = useForm({
    resolver: standardSchemaResolver(createBoardSchema),
    defaultValues: {
      name: '',
      description: '',
      isPublic: true,
    },
  })

  function onSubmit(data: CreateBoardOutput) {
    mutation.mutate(data, {
      onSuccess: (board) => {
        setIsOpen(false)
        form.reset()
        void navigate({
          to: '/admin/settings/boards',
          search: { board: board.slug },
        })
        router.invalidate()
      },
    })
  }

  function handleOpenChange(nextOpen: boolean) {
    setIsOpen(nextOpen)
    if (!nextOpen) {
      form.reset()
      mutation.reset()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <PlusIcon className="h-4 w-4" />
            {m.board_new_button()}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>{m.board_create_title()}</DialogTitle>
              <DialogDescription>{m.board_create_description()}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {mutation.isError && (
                <FormError message={mutation.error?.message ?? m.common_something_went_wrong()} />
              )}

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{m.board_name_label()}</FormLabel>
                    <FormControl>
                      <Input placeholder={m.board_name_placeholder()} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{m.common_description()}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={m.board_description_placeholder()}
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isPublic"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <FormLabel>{m.board_public_toggle_title()}</FormLabel>
                      <FormDescription>{m.board_public_toggle_description()}</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                {m.common_cancel()}
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? m.board_creating() : m.board_create_button()}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

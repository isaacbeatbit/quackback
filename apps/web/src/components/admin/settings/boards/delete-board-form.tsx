import { useRouter, useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { deleteBoardSchema, type DeleteBoardInput } from '@/lib/shared/schemas/boards'
import { useDeleteBoard } from '@/lib/client/mutations'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { WarningBox } from '@/components/shared/warning-box'
import { FormError } from '@/components/shared/form-error'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import type { BoardId } from '@quackback/ids'
import * as m from '@/paraglide/messages'

interface Board {
  id: BoardId
  name: string
  slug: string
}

interface DeleteBoardFormProps {
  board: Board
}

export function DeleteBoardForm({ board }: DeleteBoardFormProps) {
  const router = useRouter()
  const navigate = useNavigate()
  const mutation = useDeleteBoard()

  const form = useForm<DeleteBoardInput>({
    resolver: standardSchemaResolver(deleteBoardSchema),
    defaultValues: {
      confirmName: '',
    },
  })

  const confirmName = form.watch('confirmName')
  const canDelete = confirmName === board.name

  function onSubmit() {
    if (!canDelete) return

    mutation.mutate(
      { id: board.id },
      {
        onSuccess: () => {
          // Navigate to boards page without board param - will auto-select first remaining board
          void navigate({
            to: '/admin/settings/boards',
            search: {},
          })
          router.invalidate()
        },
      }
    )
  }

  return (
    <div className="space-y-4">
      <WarningBox title={m.board_delete_title()} description={m.board_delete_description()} />

      {mutation.isError && (
        <FormError message={mutation.error?.message ?? m.common_something_went_wrong()} />
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="confirmName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{m.board_delete_confirm_label({ name: board.name })}</FormLabel>
                <FormControl>
                  <Input placeholder={board.name} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" variant="destructive" disabled={!canDelete || mutation.isPending}>
            {mutation.isPending ? m.board_deleting() : m.board_delete_button()}
          </Button>
        </form>
      </Form>
    </div>
  )
}

import { CompactPostCard } from '@/components/shared/compact-post-card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { MergePreview } from './merge-preview'
import * as m from '@/paraglide/messages'

interface MergeConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  preview: MergePreview
  onConfirm: () => void
  isPending: boolean
}

export function MergeConfirmDialog({
  open,
  onOpenChange,
  preview,
  onConfirm,
  isPending,
}: MergeConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{m.merge_confirm_title()}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>{m.merge_confirm_description()}</p>

              {/* Merged result card */}
              <CompactPostCard
                title={preview.title}
                voteCount={preview.voteCount}
                statusName={preview.statusName}
                statusColor={preview.statusColor}
                description={preview.content}
                commentCount={preview.commentCount}
              />

              <p className="text-xs text-muted-foreground">{m.merge_confirm_note()}</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>{m.common_cancel()}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isPending}>
            {isPending ? m.merge_confirm_merging() : m.merge_confirm_button()}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

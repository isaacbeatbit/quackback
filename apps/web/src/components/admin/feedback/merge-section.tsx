'use client'

import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ArrowRightIcon } from '@heroicons/react/16/solid'
import { ChevronUpIcon } from '@heroicons/react/24/solid'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { StatusBadge } from '@/components/ui/status-badge'
import { useMergePost } from '@/lib/client/mutations/post-merge'
import { findSimilarPostsFn, type SimilarPost } from '@/lib/server/functions/public-posts'
import * as m from '@/paraglide/messages'
import { mergeSuggestionQueries } from '@/lib/client/queries/signals'
import { inboxKeys } from '@/lib/client/hooks/use-inbox-query'
import type { PostId } from '@quackback/ids'

// ============================================================================
// Merge Into Dialog (shown when admin wants to merge current post into another)
// ============================================================================

interface MergeIntoDialogProps {
  postId: PostId
  postTitle: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MergeIntoDialog({ postId, postTitle, open, onOpenChange }: MergeIntoDialogProps) {
  const [searchQuery, setSearchQuery] = useState(postTitle)
  const [confirmTarget, setConfirmTarget] = useState<SimilarPost | null>(null)
  const [mergingId, setMergingId] = useState<string | null>(null)
  const merge = useMergePost()
  const queryClient = useQueryClient()

  // Reset search when dialog opens with current post title
  useEffect(() => {
    if (open) {
      setSearchQuery(postTitle)
      setConfirmTarget(null)
    }
  }, [open, postTitle])

  const { data: suggestions, isLoading } = useQuery({
    queryKey: ['merge-suggestions', 'search-into', postId, searchQuery],
    queryFn: async () => {
      const result = await findSimilarPostsFn({ data: { title: searchQuery, limit: 8 } })
      return result.filter((p) => p.id !== postId)
    },
    enabled: open && searchQuery.length >= 3,
    staleTime: 30_000,
  })

  const handleMerge = async () => {
    if (!confirmTarget) return
    setMergingId(confirmTarget.id)
    try {
      await merge.mutateAsync({
        duplicatePostId: postId,
        canonicalPostId: confirmTarget.id as PostId,
      })
      queryClient.invalidateQueries({ queryKey: ['merged-posts'] })
      toast.success(m.feedback_merge_success())
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : m.feedback_merge_failed())
    } finally {
      setMergingId(null)
      setConfirmTarget(null)
    }
  }

  return (
    <>
      <Dialog open={open && !confirmTarget} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg p-0 gap-0">
          <DialogHeader className="px-5 pt-5 pb-3">
            <DialogTitle className="text-base">{m.feedback_merge_into_another_title()}</DialogTitle>
            <DialogDescription>{m.feedback_merge_into_another_description()}</DialogDescription>
          </DialogHeader>

          <div className="px-5 pb-3">
            <Input
              type="text"
              placeholder={m.feedback_merge_search_placeholder()}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
          </div>

          <div className="min-h-[200px] max-h-[400px] overflow-y-auto border-t border-border/50">
            {isLoading && searchQuery.length >= 3 && (
              <p className="text-sm text-muted-foreground py-6 text-center">
                {m.feedback_searching()}
              </p>
            )}

            {suggestions && suggestions.length > 0 && (
              <div className="divide-y divide-border/50">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion.id}
                    type="button"
                    onClick={() => setConfirmTarget(suggestion)}
                    disabled={merge.isPending}
                    className="w-full text-left flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors"
                  >
                    {/* Vote count column - matches PostCard style */}
                    <div className="flex flex-col items-center justify-center shrink-0 w-11 py-1.5 rounded-lg border text-muted-foreground bg-muted/40 border-border/50">
                      <ChevronUpIcon className="h-4 w-4" />
                      <span className="text-sm font-semibold tabular-nums text-foreground">
                        {suggestion.voteCount}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        {suggestion.status && (
                          <StatusBadge
                            name={suggestion.status.name}
                            color={suggestion.status.color}
                          />
                        )}
                        <h3 className="font-medium text-sm text-foreground line-clamp-1 flex-1">
                          {suggestion.title}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="text-muted-foreground/60">
                          {suggestion.matchStrength === 'strong'
                            ? m.feedback_merge_match_strong()
                            : suggestion.matchStrength === 'good'
                              ? m.feedback_merge_match_good()
                              : m.feedback_merge_match_possible()}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {suggestions && suggestions.length === 0 && searchQuery.length >= 3 && !isLoading && (
              <p className="text-sm text-muted-foreground py-6 text-center">
                {m.feedback_merge_no_similar_found()}
              </p>
            )}

            {searchQuery.length < 3 && !isLoading && (
              <p className="text-sm text-muted-foreground py-6 text-center">
                {m.feedback_merge_type_minimum()}
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Merge confirmation dialog */}
      <AlertDialog open={!!confirmTarget} onOpenChange={(o) => !o && setConfirmTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{m.feedback_merge_confirm_title()}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>{m.feedback_merge_confirm_description()}</p>
                <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3 text-sm overflow-hidden">
                  <span className="truncate flex-1 min-w-0 font-medium text-foreground">
                    {postTitle}
                  </span>
                  <ArrowRightIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate flex-1 min-w-0 font-medium text-foreground">
                    {confirmTarget?.title}
                  </span>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={merge.isPending}>{m.common_cancel()}</AlertDialogCancel>
            <AlertDialogAction onClick={handleMerge} disabled={merge.isPending}>
              {mergingId ? m.feedback_merging() : m.feedback_merge_button()}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

// ============================================================================
// Merge Others Dialog (merge other posts INTO the current one)
// ============================================================================

interface MergeOthersDialogProps {
  postId: PostId
  postTitle: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MergeOthersDialog({
  postId,
  postTitle,
  open,
  onOpenChange,
}: MergeOthersDialogProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isMerging, setIsMerging] = useState(false)
  const merge = useMergePost()
  const queryClient = useQueryClient()

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setSearchQuery('')
      setSelectedIds(new Set())
    }
  }, [open])

  // AI-suggested duplicates
  const { data: aiSuggestions } = useQuery({
    ...mergeSuggestionQueries.forPost(postId),
    enabled: open,
  })

  // Manual search results
  const { data: searchResults, isLoading } = useQuery({
    queryKey: ['merge-suggestions', 'search-others', postId, searchQuery],
    queryFn: async () => {
      const result = await findSimilarPostsFn({ data: { title: searchQuery, limit: 8 } })
      return result.filter((p) => p.id !== postId)
    },
    enabled: open && searchQuery.length >= 3,
    staleTime: 30_000,
  })

  // Build AI suggestion post list (deduplicated against search results)
  const aiPosts: Array<{
    id: string
    title: string
    voteCount: number
    status: { name: string; color: string } | null
    reasoning?: string
  }> = (aiSuggestions ?? [])
    .filter((suggestion) => suggestion.targetPostId === postId)
    .map((suggestion) => ({
      id: suggestion.sourcePostId,
      title: suggestion.sourcePostTitle,
      voteCount: suggestion.sourcePostVoteCount,
      status: suggestion.sourcePostStatusName
        ? {
            name: suggestion.sourcePostStatusName,
            color: suggestion.sourcePostStatusColor ?? '',
          }
        : null,
      reasoning: suggestion.llmReasoning ?? undefined,
    }))

  // Filter out AI-suggested IDs from search results to avoid duplication
  const aiPostIds = new Set(aiPosts.map((p) => p.id))
  const filteredSearchResults = searchResults?.filter((p) => !aiPostIds.has(p.id))

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleMerge = async () => {
    if (selectedIds.size === 0) return
    setIsMerging(true)
    try {
      await Promise.all(
        [...selectedIds].map((duplicateId) =>
          merge.mutateAsync({
            duplicatePostId: duplicateId as PostId,
            canonicalPostId: postId,
          })
        )
      )
      queryClient.invalidateQueries({ queryKey: ['merged-posts'] })
      queryClient.invalidateQueries({ queryKey: inboxKeys.lists() })
      queryClient.invalidateQueries({ queryKey: ['merge-suggestions'] })
      toast.success(
        selectedIds.size === 1
          ? m.feedback_merge_selected_count_one({ count: '1' })
          : m.feedback_merge_selected_count_other({ count: String(selectedIds.size) })
      )
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : m.feedback_merge_failed())
    } finally {
      setIsMerging(false)
    }
  }

  const hasAiSuggestions = aiPosts.length > 0
  const hasSearchResults = filteredSearchResults && filteredSearchResults.length > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 gap-0">
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="text-base">{m.feedback_merge_into_this_title()}</DialogTitle>
          <DialogDescription>
            {m.feedback_merge_into_this_description({ postTitle })}
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 pb-3">
          <Input
            type="text"
            placeholder={m.feedback_merge_search_placeholder()}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
        </div>

        <div className="min-h-[200px] max-h-[400px] overflow-y-auto border-t border-border/50">
          {/* AI Suggested section */}
          {hasAiSuggestions && (
            <>
              <div className="px-4 py-2 text-xs font-medium text-muted-foreground/60 uppercase tracking-wider bg-muted/20">
                {m.feedback_merge_ai_suggested()}
              </div>
              <div className="divide-y divide-border/50">
                {aiPosts.map((post) => (
                  <MergeOthersRow
                    key={post.id}
                    title={post.title}
                    voteCount={post.voteCount}
                    status={post.status}
                    subtitle={post.reasoning}
                    selected={selectedIds.has(post.id)}
                    disabled={isMerging}
                    onToggle={() => toggleSelection(post.id)}
                  />
                ))}
              </div>
            </>
          )}

          {/* Search Results section */}
          {isLoading && searchQuery.length >= 3 && (
            <p className="text-sm text-muted-foreground py-6 text-center">
              {m.feedback_searching()}
            </p>
          )}

          {hasSearchResults && (
            <>
              {(hasAiSuggestions || searchQuery.length >= 3) && (
                <div className="px-4 py-2 text-xs font-medium text-muted-foreground/60 uppercase tracking-wider bg-muted/20">
                  {m.feedback_merge_search_results()}
                </div>
              )}
              <div className="divide-y divide-border/50">
                {filteredSearchResults.map((post) => (
                  <MergeOthersRow
                    key={post.id}
                    title={post.title}
                    voteCount={post.voteCount}
                    status={post.status}
                    subtitle={
                      post.matchStrength === 'strong'
                        ? m.feedback_merge_match_strong()
                        : post.matchStrength === 'good'
                          ? m.feedback_merge_match_good()
                          : m.feedback_merge_match_possible()
                    }
                    selected={selectedIds.has(post.id)}
                    disabled={isMerging}
                    onToggle={() => toggleSelection(post.id)}
                  />
                ))}
              </div>
            </>
          )}

          {!hasAiSuggestions && !hasSearchResults && searchQuery.length >= 3 && !isLoading && (
            <p className="text-sm text-muted-foreground py-6 text-center">
              {m.feedback_merge_no_similar_found()}
            </p>
          )}

          {!hasAiSuggestions && searchQuery.length < 3 && !isLoading && (
            <p className="text-sm text-muted-foreground py-6 text-center">
              {m.feedback_merge_type_minimum()}
            </p>
          )}
        </div>

        {/* Footer with merge button */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border/50">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isMerging}
          >
            {m.common_cancel()}
          </Button>
          <Button size="sm" onClick={handleMerge} disabled={selectedIds.size === 0 || isMerging}>
            {isMerging
              ? m.feedback_merging()
              : selectedIds.size === 0
                ? m.feedback_merge_select_posts()
                : selectedIds.size === 1
                  ? m.feedback_merge_selected_count_one({ count: '1' })
                  : m.feedback_merge_selected_count_other({ count: String(selectedIds.size) })}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** Shared row component for MergeOthersDialog results */
function MergeOthersRow({
  title,
  voteCount,
  status,
  subtitle,
  selected,
  disabled,
  onToggle,
}: {
  title: string
  voteCount: number
  status: { name: string; color: string } | null
  subtitle?: string
  selected: boolean
  disabled: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className="w-full text-left flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors"
    >
      <Checkbox checked={selected} className="shrink-0" tabIndex={-1} />

      <div className="flex flex-col items-center justify-center shrink-0 w-11 py-1.5 rounded-lg border text-muted-foreground bg-muted/40 border-border/50">
        <ChevronUpIcon className="h-4 w-4" />
        <span className="text-sm font-semibold tabular-nums text-foreground">{voteCount}</span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          {status && <StatusBadge name={status.name} color={status.color} />}
          <h3 className="font-medium text-sm text-foreground line-clamp-1 flex-1">{title}</h3>
        </div>
        {subtitle && <p className="text-xs text-muted-foreground/60 line-clamp-1">{subtitle}</p>}
      </div>
    </button>
  )
}

// ============================================================================
// Merge Info Banner (shown on posts that have been merged into another)
// ============================================================================

interface MergeInfoBannerProps {
  mergeInfo: {
    canonicalPostId: string
    canonicalPostTitle: string
    canonicalPostBoardSlug: string
    mergedAt: Date | string
  }
  onNavigateToPost?: (postId: string) => void
}

export function MergeInfoBanner({ mergeInfo, onNavigateToPost }: MergeInfoBannerProps) {
  return (
    <div className="mx-6 mt-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40">
      <p className="text-sm text-amber-800 dark:text-amber-200">
        {m.feedback_merged_into_prefix()}{' '}
        <button
          type="button"
          onClick={() => onNavigateToPost?.(mergeInfo.canonicalPostId)}
          className="font-medium underline underline-offset-2 hover:text-amber-900 dark:hover:text-amber-100"
        >
          {mergeInfo.canonicalPostTitle}
        </button>
      </p>
    </div>
  )
}

// ============================================================================
// Merge Actions Button (triggers the merge dialog)
// ============================================================================

interface MergeActionsProps {
  postId: PostId
  postTitle: string
  canonicalPostId?: PostId | null
  /** Controlled dialog state (optional — falls back to internal state) */
  showDialog?: boolean
  onShowDialogChange?: (show: boolean) => void
}

export function MergeActions({
  postId,
  postTitle,
  canonicalPostId,
  showDialog,
  onShowDialogChange,
}: MergeActionsProps) {
  const [internalShowDialog, setInternalShowDialog] = useState(false)
  const isDialogOpen = showDialog ?? internalShowDialog
  const setDialogOpen = onShowDialogChange ?? setInternalShowDialog

  return (
    <>
      {!canonicalPostId && (
        <MergeIntoDialog
          postId={postId}
          postTitle={postTitle}
          open={isDialogOpen}
          onOpenChange={setDialogOpen}
        />
      )}
    </>
  )
}

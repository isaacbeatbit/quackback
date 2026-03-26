import { useState } from 'react'
import { z } from 'zod'
import { ArrowDownTrayIcon, ArrowPathIcon, DocumentArrowDownIcon } from '@heroicons/react/24/solid'
import { Button } from '@/components/ui/button'
import * as m from '@/paraglide/messages'

const errorResponseSchema = z.object({
  error: z.string().optional(),
})

interface BoardExportSectionProps {
  boardId: string
}

export function BoardExportSection({ boardId }: BoardExportSectionProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleExport = async () => {
    setError(null)
    setIsExporting(true)

    try {
      const params = new URLSearchParams({
        boardId,
      })

      const response = await fetch(`/api/export?${params}`)

      if (!response.ok) {
        const data = errorResponseSchema.parse(await response.json())
        throw new Error(data.error || m.board_export_failed())
      }

      const contentDisposition = response.headers.get('Content-Disposition')
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/)
      const filename = filenameMatch ? filenameMatch[1] : `posts-export-${Date.now()}.csv`

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : m.board_export_failed())
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="rounded-xl border border-border/50 bg-card shadow-sm p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
          <ArrowDownTrayIcon className="h-5 w-5 text-green-500" />
        </div>
        <div>
          <h2 className="font-semibold text-foreground">{m.board_export_to_csv_title()}</h2>
          <p className="text-sm text-muted-foreground">{m.board_export_to_csv_description()}</p>
        </div>
      </div>

      <div className="bg-muted/50 rounded-lg p-4 mb-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <DocumentArrowDownIcon className="h-4 w-4" />
          <span>{m.board_export_includes()}</span>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-destructive/10 text-destructive text-sm rounded-lg">
          {error}
        </div>
      )}

      <Button onClick={handleExport} disabled={isExporting}>
        {isExporting ? (
          <>
            <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
            {m.board_exporting()}
          </>
        ) : (
          <>
            <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
            {m.board_export_csv()}
          </>
        )}
      </Button>
    </div>
  )
}

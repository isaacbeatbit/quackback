import { useState, useRef, useCallback } from 'react'
import { z } from 'zod'
import {
  ArrowUpTrayIcon,
  DocumentTextIcon,
  XMarkIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/solid'
import { Button } from '@/components/ui/button'
import { CSV_TEMPLATE } from '@/lib/shared/schemas/import'
import type { ImportResult } from '@/lib/server/domains/import/types'
import * as m from '@/paraglide/messages'

const errorResponseSchema = z.object({
  error: z.string().optional(),
})

const importResponseSchema = z.object({
  imported: z.number(),
  skipped: z.number(),
  errors: z.array(z.object({ row: z.number(), message: z.string() })),
  createdTags: z.array(z.string()),
})

interface BoardImportSectionProps {
  boardId: string
}

type ImportState = 'idle' | 'uploading' | 'completed' | 'failed'

export function BoardImportSection({ boardId }: BoardImportSectionProps) {
  const [state, setState] = useState<ImportState>('idle')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = useCallback((file: File) => {
    setError(null)
    if (!file.type.includes('csv') && !file.name.endsWith('.csv')) {
      setError(m.board_import_select_csv_error())
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError(m.board_import_file_size_error())
      return
    }
    setSelectedFile(file)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const file = e.dataTransfer.files[0]
      if (file) handleFileSelect(file)
    },
    [handleFileSelect]
  )

  const handleImport = async () => {
    if (!selectedFile) return

    setError(null)
    setState('uploading')

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('boardId', boardId)

      const response = await fetch('/api/import', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const data = errorResponseSchema.parse(await response.json())
        throw new Error(data.error || m.board_import_failed())
      }

      const data = importResponseSchema.parse(await response.json())

      // Import is now synchronous - results are returned immediately
      setResult({
        imported: data.imported,
        skipped: data.skipped,
        errors: data.errors,
        createdTags: data.createdTags,
      })
      setState('completed')
    } catch (err) {
      setState('failed')
      setError(err instanceof Error ? err.message : m.board_import_failed())
    }
  }

  const handleReset = () => {
    setState('idle')
    setSelectedFile(null)
    setError(null)
    setResult(null)
  }

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'import-template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="rounded-xl border border-border/50 bg-card shadow-sm p-6">
      {state === 'idle' && (
        <>
          <div
            className="border-2 border-dashed border-border/50 rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
            />
            {selectedFile ? (
              <div className="flex items-center justify-center gap-2">
                <DocumentTextIcon className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">{selectedFile.name}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedFile(null)
                  }}
                  className="p-1 hover:bg-muted rounded"
                >
                  <XMarkIcon className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            ) : (
              <>
                <ArrowUpTrayIcon className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">{m.board_import_dropzone_title()}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {m.board_import_dropzone_description()}
                </p>
              </>
            )}
          </div>

          {error && (
            <div className="mt-4 p-3 bg-destructive/10 text-destructive text-sm rounded-lg flex items-center gap-2">
              <ExclamationCircleIcon className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="mt-4 flex items-center gap-2">
            <Button onClick={handleImport} disabled={!selectedFile}>
              <ArrowUpTrayIcon className="h-4 w-4 mr-2" />
              {m.board_import_title()}
            </Button>
            <Button variant="outline" onClick={downloadTemplate}>
              <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
              {m.board_import_download_template()}
            </Button>
          </div>
        </>
      )}

      {state === 'uploading' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <ArrowPathIcon className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm font-medium">{m.board_import_processing()}</span>
          </div>
        </div>
      )}

      {state === 'completed' && result && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-green-600">
            <CheckCircleIcon className="h-5 w-5" />
            <span className="font-medium">{m.board_import_complete()}</span>
          </div>
          <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
            <p>{m.board_import_posts_imported({ count: String(result.imported) })}</p>
            {result.skipped > 0 && (
              <p className="text-amber-600">
                {m.board_import_rows_skipped({ count: String(result.skipped) })}
              </p>
            )}
            {result.createdTags.length > 0 && (
              <p>{m.board_import_tags_created({ count: String(result.createdTags.length) })}</p>
            )}
            {result.errors.length > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                  {m.board_import_view_errors({ count: String(result.errors.length) })}
                </summary>
                <ul className="mt-2 space-y-1 text-destructive">
                  {result.errors.slice(0, 10).map((err, i) => (
                    <li key={i}>
                      {m.board_import_error_row({ row: String(err.row), message: err.message })}
                    </li>
                  ))}
                  {result.errors.length > 10 && (
                    <li>
                      {m.board_import_more_errors({ count: String(result.errors.length - 10) })}
                    </li>
                  )}
                </ul>
              </details>
            )}
          </div>
          <Button onClick={handleReset}>{m.board_import_more()}</Button>
        </div>
      )}

      {state === 'failed' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-destructive">
            <ExclamationCircleIcon className="h-5 w-5" />
            <span className="font-medium">{m.board_import_failed()}</span>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button onClick={handleReset} variant="outline">
            {m.error_try_again()}
          </Button>
        </div>
      )}
    </div>
  )
}

import { useState, useCallback } from 'react'
import { generateExportFilename, type ExportFilenameOptions } from '@/lib/export-filename'
import { notify } from '@/lib/notify'

export interface DownloadConfig {
  /** Filename generator options */
  filenameOptions: ExportFilenameOptions
  /** Optional override for the default filename shown in the save dialog.
   *  When provided, this takes precedence over the generated filename. */
  defaultPathOverride?: string
  /** How to obtain the binary data to write */
  fetchData: () => Promise<{ data: string; encoding: 'base64' | 'utf8' }>
  /** File type filter for save dialog */
  dialogFilters?: Array<{ name: string; extensions: string[] }>
}

export interface UseDownloadActionReturn {
  isDownloading: boolean
  download: (config: DownloadConfig) => Promise<void>
}

export function useDownloadAction(): UseDownloadActionReturn {
  const [isDownloading, setIsDownloading] = useState(false)

  const download = useCallback(async (config: DownloadConfig): Promise<void> => {
    // Step 1: Generate default filename
    const defaultPath = config.defaultPathOverride ?? generateExportFilename(config.filenameOptions)

    // Step 2: Show save dialog
    const filePath = await window.electronAPI.showSaveDialog({
      defaultPath,
      filters: config.dialogFilters,
    })

    // Step 3: If user cancelled (null), return without effect
    if (filePath === null || filePath === undefined) {
      return
    }

    // Step 4: Set downloading state
    setIsDownloading(true)

    try {
      // Step 5: Fetch data
      const { data, encoding } = await config.fetchData()

      // Step 6: Write file
      await window.electronAPI.writeFile({ filePath, data, encoding })

      // Step 7: Show success notification
      notify(`File berhasil disimpan: ${filePath}`, 'success')
    } catch (error) {
      // Step 9: Handle errors from fetchData or writeFile
      const message = error instanceof Error ? error.message : String(error)
      notify(`Gagal mengunduh: ${message}`, 'error')
    } finally {
      // Step 8 / Step 9: Reset downloading state
      setIsDownloading(false)
    }
  }, [])

  return { isDownloading, download }
}

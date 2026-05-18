import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDownloadAction } from '@/hooks/use-download-action'
import * as notifyModule from '@/lib/notify'

// Mock notify module
vi.mock('@/lib/notify', () => ({
  notify: vi.fn(),
  setNotificationAdder: vi.fn(),
  notifyDialogAction: vi.fn(),
}))

const mockNotify = vi.mocked(notifyModule.notify)

describe('useDownloadAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns isDownloading=false and download function initially', () => {
    const { result } = renderHook(() => useDownloadAction())
    expect(result.current.isDownloading).toBe(false)
    expect(typeof result.current.download).toBe('function')
  })

  describe('successful download', () => {
    it('calls showSaveDialog with generated defaultPath and filters', async () => {
      const mockShowSaveDialog = vi.mocked(window.electronAPI.showSaveDialog)
      const mockWriteFile = vi.mocked(window.electronAPI.writeFile)
      mockShowSaveDialog.mockResolvedValue('/some/path/data-siswa-semua-2025-01-15.csv')
      mockWriteFile.mockResolvedValue(undefined)

      const { result } = renderHook(() => useDownloadAction())

      const config = {
        filenameOptions: { dataType: 'data-siswa' as const, format: 'csv' as const },
        fetchData: vi.fn().mockResolvedValue({ data: 'csv-content', encoding: 'utf8' as const }),
        dialogFilters: [{ name: 'CSV Files', extensions: ['csv'] }],
      }

      await act(async () => {
        await result.current.download(config)
      })

      expect(mockShowSaveDialog).toHaveBeenCalledWith(
        expect.objectContaining({
          defaultPath: expect.stringMatching(/^data-siswa-.*\.csv$/),
          filters: [{ name: 'CSV Files', extensions: ['csv'] }],
        })
      )
    })

    it('calls writeFile with filePath, data, and encoding from fetchData', async () => {
      const mockShowSaveDialog = vi.mocked(window.electronAPI.showSaveDialog)
      const mockWriteFile = vi.mocked(window.electronAPI.writeFile)
      mockShowSaveDialog.mockResolvedValue('/downloads/report.xlsx')
      mockWriteFile.mockResolvedValue(undefined)

      const { result } = renderHook(() => useDownloadAction())

      const config = {
        filenameOptions: { dataType: 'laporan-absensi' as const, format: 'xlsx' as const },
        fetchData: vi.fn().mockResolvedValue({ data: 'base64data==', encoding: 'base64' as const }),
      }

      await act(async () => {
        await result.current.download(config)
      })

      expect(mockWriteFile).toHaveBeenCalledWith({
        filePath: '/downloads/report.xlsx',
        data: 'base64data==',
        encoding: 'base64',
      })
    })

    it('shows success notification with file path', async () => {
      const mockShowSaveDialog = vi.mocked(window.electronAPI.showSaveDialog)
      const mockWriteFile = vi.mocked(window.electronAPI.writeFile)
      mockShowSaveDialog.mockResolvedValue('/downloads/report.csv')
      mockWriteFile.mockResolvedValue(undefined)

      const { result } = renderHook(() => useDownloadAction())

      const config = {
        filenameOptions: { dataType: 'daftar-guru' as const, format: 'csv' as const },
        fetchData: vi.fn().mockResolvedValue({ data: 'data', encoding: 'utf8' as const }),
      }

      await act(async () => {
        await result.current.download(config)
      })

      expect(mockNotify).toHaveBeenCalledWith(
        expect.stringContaining('/downloads/report.csv'),
        'success'
      )
    })

    it('resets isDownloading to false after success', async () => {
      const mockShowSaveDialog = vi.mocked(window.electronAPI.showSaveDialog)
      const mockWriteFile = vi.mocked(window.electronAPI.writeFile)
      mockShowSaveDialog.mockResolvedValue('/downloads/file.csv')
      mockWriteFile.mockResolvedValue(undefined)

      const { result } = renderHook(() => useDownloadAction())

      const config = {
        filenameOptions: { dataType: 'data-siswa' as const, format: 'csv' as const },
        fetchData: vi.fn().mockResolvedValue({ data: 'data', encoding: 'utf8' as const }),
      }

      await act(async () => {
        await result.current.download(config)
      })

      expect(result.current.isDownloading).toBe(false)
    })
  })

  describe('cancelled download (showSaveDialog returns null)', () => {
    it('does not call fetchData when dialog is cancelled', async () => {
      const mockShowSaveDialog = vi.mocked(window.electronAPI.showSaveDialog)
      mockShowSaveDialog.mockResolvedValue(null)

      const { result } = renderHook(() => useDownloadAction())

      const fetchData = vi.fn()
      const config = {
        filenameOptions: { dataType: 'data-siswa' as const, format: 'csv' as const },
        fetchData,
      }

      await act(async () => {
        await result.current.download(config)
      })

      expect(fetchData).not.toHaveBeenCalled()
    })

    it('does not call writeFile when dialog is cancelled', async () => {
      const mockShowSaveDialog = vi.mocked(window.electronAPI.showSaveDialog)
      const mockWriteFile = vi.mocked(window.electronAPI.writeFile)
      mockShowSaveDialog.mockResolvedValue(null)

      const { result } = renderHook(() => useDownloadAction())

      const config = {
        filenameOptions: { dataType: 'data-siswa' as const, format: 'csv' as const },
        fetchData: vi.fn().mockResolvedValue({ data: 'data', encoding: 'utf8' as const }),
      }

      await act(async () => {
        await result.current.download(config)
      })

      expect(mockWriteFile).not.toHaveBeenCalled()
    })

    it('does not show any notification when dialog is cancelled', async () => {
      const mockShowSaveDialog = vi.mocked(window.electronAPI.showSaveDialog)
      mockShowSaveDialog.mockResolvedValue(null)

      const { result } = renderHook(() => useDownloadAction())

      const config = {
        filenameOptions: { dataType: 'data-siswa' as const, format: 'csv' as const },
        fetchData: vi.fn(),
      }

      await act(async () => {
        await result.current.download(config)
      })

      expect(mockNotify).not.toHaveBeenCalled()
    })

    it('keeps isDownloading as false when dialog is cancelled', async () => {
      const mockShowSaveDialog = vi.mocked(window.electronAPI.showSaveDialog)
      mockShowSaveDialog.mockResolvedValue(null)

      const { result } = renderHook(() => useDownloadAction())

      const config = {
        filenameOptions: { dataType: 'data-siswa' as const, format: 'csv' as const },
        fetchData: vi.fn(),
      }

      await act(async () => {
        await result.current.download(config)
      })

      expect(result.current.isDownloading).toBe(false)
    })
  })

  describe('error handling', () => {
    it('shows error notification when fetchData throws', async () => {
      const mockShowSaveDialog = vi.mocked(window.electronAPI.showSaveDialog)
      mockShowSaveDialog.mockResolvedValue('/downloads/file.csv')

      const { result } = renderHook(() => useDownloadAction())

      const config = {
        filenameOptions: { dataType: 'data-siswa' as const, format: 'csv' as const },
        fetchData: vi.fn().mockRejectedValue(new Error('Network error')),
      }

      await act(async () => {
        await result.current.download(config)
      })

      expect(mockNotify).toHaveBeenCalledWith(
        expect.stringContaining('Network error'),
        'error'
      )
    })

    it('resets isDownloading to false when fetchData throws', async () => {
      const mockShowSaveDialog = vi.mocked(window.electronAPI.showSaveDialog)
      mockShowSaveDialog.mockResolvedValue('/downloads/file.csv')

      const { result } = renderHook(() => useDownloadAction())

      const config = {
        filenameOptions: { dataType: 'data-siswa' as const, format: 'csv' as const },
        fetchData: vi.fn().mockRejectedValue(new Error('Network error')),
      }

      await act(async () => {
        await result.current.download(config)
      })

      expect(result.current.isDownloading).toBe(false)
    })

    it('shows error notification when writeFile throws', async () => {
      const mockShowSaveDialog = vi.mocked(window.electronAPI.showSaveDialog)
      const mockWriteFile = vi.mocked(window.electronAPI.writeFile)
      mockShowSaveDialog.mockResolvedValue('/downloads/file.csv')
      mockWriteFile.mockRejectedValue(new Error('Disk full'))

      const { result } = renderHook(() => useDownloadAction())

      const config = {
        filenameOptions: { dataType: 'data-siswa' as const, format: 'csv' as const },
        fetchData: vi.fn().mockResolvedValue({ data: 'data', encoding: 'utf8' as const }),
      }

      await act(async () => {
        await result.current.download(config)
      })

      expect(mockNotify).toHaveBeenCalledWith(
        expect.stringContaining('Disk full'),
        'error'
      )
    })

    it('resets isDownloading to false when writeFile throws', async () => {
      const mockShowSaveDialog = vi.mocked(window.electronAPI.showSaveDialog)
      const mockWriteFile = vi.mocked(window.electronAPI.writeFile)
      mockShowSaveDialog.mockResolvedValue('/downloads/file.csv')
      mockWriteFile.mockRejectedValue(new Error('Permission denied'))

      const { result } = renderHook(() => useDownloadAction())

      const config = {
        filenameOptions: { dataType: 'data-siswa' as const, format: 'csv' as const },
        fetchData: vi.fn().mockResolvedValue({ data: 'data', encoding: 'utf8' as const }),
      }

      await act(async () => {
        await result.current.download(config)
      })

      expect(result.current.isDownloading).toBe(false)
    })

    it('handles non-Error objects thrown by fetchData', async () => {
      const mockShowSaveDialog = vi.mocked(window.electronAPI.showSaveDialog)
      mockShowSaveDialog.mockResolvedValue('/downloads/file.csv')

      const { result } = renderHook(() => useDownloadAction())

      const config = {
        filenameOptions: { dataType: 'data-siswa' as const, format: 'csv' as const },
        fetchData: vi.fn().mockRejectedValue('string error'),
      }

      await act(async () => {
        await result.current.download(config)
      })

      expect(mockNotify).toHaveBeenCalledWith(expect.any(String), 'error')
      expect(result.current.isDownloading).toBe(false)
    })
  })

  describe('download flow order', () => {
    it('calls fetchData only after showSaveDialog returns a path', async () => {
      const callOrder: string[] = []
      const mockShowSaveDialog = vi.mocked(window.electronAPI.showSaveDialog)
      const mockWriteFile = vi.mocked(window.electronAPI.writeFile)

      mockShowSaveDialog.mockImplementation(async () => {
        callOrder.push('showSaveDialog')
        return '/path/file.csv'
      })
      mockWriteFile.mockImplementation(async () => {
        callOrder.push('writeFile')
      })

      const { result } = renderHook(() => useDownloadAction())

      const fetchData = vi.fn().mockImplementation(async () => {
        callOrder.push('fetchData')
        return { data: 'data', encoding: 'utf8' as const }
      })

      const config = {
        filenameOptions: { dataType: 'data-siswa' as const, format: 'csv' as const },
        fetchData,
      }

      await act(async () => {
        await result.current.download(config)
      })

      expect(callOrder).toEqual(['showSaveDialog', 'fetchData', 'writeFile'])
    })
  })
})

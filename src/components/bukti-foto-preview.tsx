import { Download, File, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"

export interface BuktiFotoPreviewProps {
  url: string
  fileName?: string
  onDownload: () => void
  isDownloading?: boolean
}

function getFileType(url: string): "image" | "pdf" | "other" {
  const lower = url.toLowerCase().split("?")[0] // strip query params before checking extension
  if (/\.(jpg|jpeg|png|gif|webp)$/.test(lower)) return "image"
  if (/\.pdf$/.test(lower)) return "pdf"
  return "other"
}

function getDisplayName(url: string, fileName?: string): string {
  if (fileName) return fileName
  const parts = url.split("?")[0].split("/")
  return parts[parts.length - 1] || "file"
}

export function BuktiFotoPreview({
  url,
  fileName,
  onDownload,
  isDownloading = false,
}: BuktiFotoPreviewProps) {
  const fileType = getFileType(url)
  const displayName = getDisplayName(url, fileName)

  return (
    <div className="flex flex-col gap-3">
      {/* Preview area */}
      <div className="rounded-lg border border-border bg-muted/30 overflow-hidden">
        {fileType === "image" ? (
          <img
            src={url}
            alt={displayName}
            className="w-full max-h-64 object-contain"
          />
        ) : (
          <div className="flex items-center gap-3 p-4">
            {fileType === "pdf" ? (
              <FileText className="size-8 shrink-0 text-red-500" />
            ) : (
              <File className="size-8 shrink-0 text-muted-foreground" />
            )}
            <span className="text-sm text-foreground truncate">{displayName}</span>
          </div>
        )}
      </div>

      {/* Download button */}
      <Button
        variant="outline"
        size="sm"
        onClick={onDownload}
        disabled={isDownloading}
        className="w-full gap-2"
      >
        <Download className="size-4" />
        {isDownloading ? "Mengunduh..." : "Unduh Bukti"}
      </Button>
    </div>
  )
}

import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { BuktiFotoPreview } from "@/components/bukti-foto-preview"

const noop = () => {}

describe("BuktiFotoPreview", () => {
  describe("file type detection — image URLs", () => {
    it.each([
      ["https://example.com/photo.jpg"],
      ["https://example.com/photo.jpeg"],
      ["https://example.com/photo.png"],
      ["https://example.com/photo.gif"],
      ["https://example.com/photo.webp"],
    ])("renders <img> for %s", (url) => {
      const { container } = render(<BuktiFotoPreview url={url} onDownload={noop} />)
      expect(container.querySelector("img")).not.toBeNull()
    })

    it("uses the URL as the img src", () => {
      const url = "https://example.com/bukti.png"
      render(<BuktiFotoPreview url={url} onDownload={noop} />)
      expect(screen.getByRole("img")).toHaveAttribute("src", url)
    })
  })

  describe("file type detection — PDF URLs", () => {
    it("does NOT render <img> for a PDF URL", () => {
      const { container } = render(
        <BuktiFotoPreview url="https://example.com/bukti.pdf" onDownload={noop} />
      )
      expect(container.querySelector("img")).toBeNull()
    })

    it("shows the filename for a PDF", () => {
      render(
        <BuktiFotoPreview
          url="https://example.com/surat-izin.pdf"
          fileName="surat-izin.pdf"
          onDownload={noop}
        />
      )
      expect(screen.getByText("surat-izin.pdf")).toBeInTheDocument()
    })
  })

  describe("file type detection — other file types", () => {
    it("does NOT render <img> for a .docx URL", () => {
      const { container } = render(
        <BuktiFotoPreview url="https://example.com/bukti.docx" onDownload={noop} />
      )
      expect(container.querySelector("img")).toBeNull()
    })

    it("shows the filename for a generic file", () => {
      render(
        <BuktiFotoPreview
          url="https://example.com/bukti.docx"
          fileName="bukti.docx"
          onDownload={noop}
        />
      )
      expect(screen.getByText("bukti.docx")).toBeInTheDocument()
    })
  })

  describe("download button", () => {
    it("renders a download button", () => {
      render(<BuktiFotoPreview url="https://example.com/photo.png" onDownload={noop} />)
      expect(screen.getByRole("button")).toBeInTheDocument()
    })

    it("calls onDownload when the button is clicked", async () => {
      const user = userEvent.setup()
      const onDownload = vi.fn()
      render(<BuktiFotoPreview url="https://example.com/photo.png" onDownload={onDownload} />)
      await user.click(screen.getByRole("button"))
      expect(onDownload).toHaveBeenCalledOnce()
    })

    it("disables the button when isDownloading is true", () => {
      render(
        <BuktiFotoPreview
          url="https://example.com/photo.png"
          onDownload={noop}
          isDownloading={true}
        />
      )
      expect(screen.getByRole("button")).toBeDisabled()
    })

    it("does NOT disable the button when isDownloading is false", () => {
      render(
        <BuktiFotoPreview
          url="https://example.com/photo.png"
          onDownload={noop}
          isDownloading={false}
        />
      )
      expect(screen.getByRole("button")).not.toBeDisabled()
    })

    it("does NOT call onDownload when button is disabled", async () => {
      const user = userEvent.setup()
      const onDownload = vi.fn()
      render(
        <BuktiFotoPreview
          url="https://example.com/photo.png"
          onDownload={onDownload}
          isDownloading={true}
        />
      )
      await user.click(screen.getByRole("button"))
      expect(onDownload).not.toHaveBeenCalled()
    })
  })

  describe("fileName prop", () => {
    it("uses fileName prop as display name when provided", () => {
      render(
        <BuktiFotoPreview
          url="https://example.com/bukti.pdf"
          fileName="surat-dokter.pdf"
          onDownload={noop}
        />
      )
      expect(screen.getByText("surat-dokter.pdf")).toBeInTheDocument()
    })

    it("falls back to filename from URL when fileName is not provided", () => {
      render(
        <BuktiFotoPreview url="https://example.com/bukti-izin.pdf" onDownload={noop} />
      )
      expect(screen.getByText("bukti-izin.pdf")).toBeInTheDocument()
    })
  })

  describe("URL with query params", () => {
    it("still detects image type when URL has query params", () => {
      const { container } = render(
        <BuktiFotoPreview
          url="https://example.com/photo.jpg?token=abc123"
          onDownload={noop}
        />
      )
      expect(container.querySelector("img")).not.toBeNull()
    })

    it("still detects PDF type when URL has query params", () => {
      const { container } = render(
        <BuktiFotoPreview
          url="https://example.com/bukti.pdf?token=abc123"
          onDownload={noop}
        />
      )
      expect(container.querySelector("img")).toBeNull()
    })
  })
})

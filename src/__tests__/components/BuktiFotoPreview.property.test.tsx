/**
 * Property-based tests for BuktiFotoPreview component.
 *
 * Validates: Requirements 11.3, 11.4, 11.5
 */
import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import fc from "fast-check"
import { BuktiFotoPreview } from "@/components/bukti-foto-preview"

const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".webp"] as const

// Arbitrary: a URL ending with one of the image extensions
const imageUrlArbitrary = fc
  .tuple(
    fc.webUrl({ withQueryParameters: false, withFragments: false }),
    fc.constantFrom(...IMAGE_EXTENSIONS)
  )
  .map(([base, ext]) => {
    // Replace any existing extension-like suffix and append the image extension
    const withoutQuery = base.split("?")[0]
    return `${withoutQuery}${ext}`
  })

// Arbitrary: a URL ending with .pdf
const pdfUrlArbitrary = fc
  .webUrl({ withQueryParameters: false, withFragments: false })
  .map((base) => `${base.split("?")[0]}.pdf`)

// Arbitrary: a URL ending with a non-image, non-pdf extension
const otherUrlArbitrary = fc
  .tuple(
    fc.webUrl({ withQueryParameters: false, withFragments: false }),
    fc.constantFrom(".docx", ".xlsx", ".txt", ".zip", ".mp4")
  )
  .map(([base, ext]) => `${base.split("?")[0]}${ext}`)

describe("BuktiFotoPreview — Property 11: Bukti File Type Detection", () => {
  /**
   * Property 11a: Image URLs render an <img> element.
   * Validates: Requirements 11.3
   */
  it("Property 11a: image URLs (.jpg/.jpeg/.png/.gif/.webp) render an <img> element", { timeout: 30000 }, () => {
    fc.assert(
      fc.property(imageUrlArbitrary, (url) => {
        const { container } = render(
          <BuktiFotoPreview url={url} onDownload={() => {}} />
        )
        expect(container.querySelector("img")).not.toBeNull()
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 11b: PDF URLs do NOT render an <img> element.
   * Validates: Requirements 11.4
   */
  it("Property 11b: PDF URLs (.pdf) do NOT render an <img> element", { timeout: 30000 }, () => {
    fc.assert(
      fc.property(pdfUrlArbitrary, (url) => {
        const { container } = render(
          <BuktiFotoPreview url={url} onDownload={() => {}} />
        )
        expect(container.querySelector("img")).toBeNull()
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 11c: Other file URLs do NOT render an <img> element.
   * Validates: Requirements 11.5
   */
  it("Property 11c: other file URLs do NOT render an <img> element", { timeout: 30000 }, () => {
    fc.assert(
      fc.property(otherUrlArbitrary, (url) => {
        const { container } = render(
          <BuktiFotoPreview url={url} onDownload={() => {}} />
        )
        expect(container.querySelector("img")).toBeNull()
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 11d: Download button is always present regardless of file type.
   * Validates: Requirements 11.1, 11.2
   */
  it("Property 11d: download button is always rendered for any URL", { timeout: 30000 }, () => {
    const anyUrlArbitrary = fc.oneof(imageUrlArbitrary, pdfUrlArbitrary, otherUrlArbitrary)
    fc.assert(
      fc.property(anyUrlArbitrary, (url) => {
        const { container } = render(
          <BuktiFotoPreview url={url} onDownload={() => {}} />
        )
        expect(container.querySelector("button")).not.toBeNull()
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 11e: Button is disabled when isDownloading is true, for any URL.
   * Validates: Requirements 11.2 (loading state)
   */
  it("Property 11e: button is disabled when isDownloading=true for any URL", { timeout: 30000 }, () => {
    const anyUrlArbitrary = fc.oneof(imageUrlArbitrary, pdfUrlArbitrary, otherUrlArbitrary)
    fc.assert(
      fc.property(anyUrlArbitrary, (url) => {
        const { container } = render(
          <BuktiFotoPreview url={url} onDownload={() => {}} isDownloading={true} />
        )
        const button = container.querySelector("button")
        expect(button).not.toBeNull()
        expect(button).toBeDisabled()
      }),
      { numRuns: 100 }
    )
  })
})

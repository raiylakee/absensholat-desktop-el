import { describe, it, expect, vi, beforeEach } from 'vitest'
import { svgElementToPngBase64 } from '@/lib/svg-to-png'

// Helper to create a minimal SVG element for testing
function createSvgElement(content = ''): SVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  svg.setAttribute('width', '100')
  svg.setAttribute('height', '100')
  svg.setAttribute('viewBox', '0 0 100 100')
  if (content) {
    svg.innerHTML = content
  }
  return svg
}

describe('svgElementToPngBase64', () => {
  let mockCanvas: HTMLCanvasElement
  let mockCtx: CanvasRenderingContext2D

  beforeEach(() => {
    // Mock canvas context
    mockCtx = {
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D

    // Mock canvas element
    mockCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn().mockReturnValue(mockCtx),
      toDataURL: vi.fn().mockReturnValue('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='),
    } as unknown as HTMLCanvasElement

    // Spy on document.createElement to intercept canvas creation
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'canvas') return mockCanvas
      return document.createElement(tagName)
    })

    // Mock Image constructor to auto-trigger onload
    vi.stubGlobal('Image', class {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      _src = ''

      get src() { return this._src }
      set src(value: string) {
        this._src = value
        // Simulate async image load
        setTimeout(() => {
          if (this.onload) this.onload()
        }, 0)
      }
    })
  })

  it('returns a base64 string without the data URL prefix', async () => {
    const svgElement = createSvgElement()
    const result = await svgElementToPngBase64(svgElement)

    // Should not contain the data URL prefix
    expect(result).not.toContain('data:image/png;base64,')
    // Should be a valid base64 string
    expect(result).toMatch(/^[A-Za-z0-9+/]+=*$/)
  })

  it('creates a canvas with the default size of 512×512', async () => {
    const svgElement = createSvgElement()
    await svgElementToPngBase64(svgElement)

    expect(mockCanvas.width).toBe(512)
    expect(mockCanvas.height).toBe(512)
  })

  it('creates a canvas with a custom size when specified', async () => {
    const svgElement = createSvgElement()
    await svgElementToPngBase64(svgElement, 256)

    expect(mockCanvas.width).toBe(256)
    expect(mockCanvas.height).toBe(256)
  })

  it('calls drawImage on the canvas context', async () => {
    const svgElement = createSvgElement()
    await svgElementToPngBase64(svgElement)

    expect(mockCtx.drawImage).toHaveBeenCalledOnce()
  })

  it('calls canvas.toDataURL with image/png', async () => {
    const svgElement = createSvgElement()
    await svgElementToPngBase64(svgElement)

    expect(mockCanvas.toDataURL).toHaveBeenCalledWith('image/png')
  })

  it('throws an error when canvas context is unavailable', async () => {
    ;(mockCanvas.getContext as ReturnType<typeof vi.fn>).mockReturnValue(null)

    const svgElement = createSvgElement()
    await expect(svgElementToPngBase64(svgElement)).rejects.toThrow(
      'Gagal mendapatkan konteks 2D dari canvas'
    )
  })

  it('throws an error when the image fails to load', async () => {
    // Override Image mock to trigger onerror instead
    vi.stubGlobal('Image', class {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      _src = ''

      get src() { return this._src }
      set src(value: string) {
        this._src = value
        setTimeout(() => {
          if (this.onerror) this.onerror()
        }, 0)
      }
    })

    const svgElement = createSvgElement()
    await expect(svgElementToPngBase64(svgElement)).rejects.toThrow(
      'Gagal memuat gambar SVG untuk konversi ke PNG'
    )
  })

  it('throws an error when toDataURL returns an unexpected format', async () => {
    ;(mockCanvas.toDataURL as ReturnType<typeof vi.fn>).mockReturnValue('data:image/jpeg;base64,abc123')

    const svgElement = createSvgElement()
    await expect(svgElementToPngBase64(svgElement)).rejects.toThrow(
      'Format data URL PNG tidak valid'
    )
  })

  it('handles SVG elements with complex content', async () => {
    const svgElement = createSvgElement(
      '<rect x="10" y="10" width="80" height="80" fill="black"/>'
    )
    const result = await svgElementToPngBase64(svgElement)

    expect(result).toBeTruthy()
    expect(result).not.toContain('data:image/png;base64,')
  })
})

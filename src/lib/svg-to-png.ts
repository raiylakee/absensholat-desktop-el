/**
 * Converts an SVG element to a PNG image encoded as a base64 string.
 *
 * Uses the browser Canvas API (available in Electron renderer process):
 * 1. Serialize the SVG element to a string via XMLSerializer
 * 2. Create a data URL from the SVG string
 * 3. Load the data URL into an Image element
 * 4. Draw the image onto a <canvas> of the given size
 * 5. Export the canvas as a PNG data URL
 * 6. Strip the data URL prefix and return the raw base64 string
 *
 * @param svgElement - The SVG DOM element to convert
 * @param size - Width and height of the output PNG in pixels (default: 512)
 * @returns A Promise that resolves to the raw base64-encoded PNG string
 * @throws Error if serialization, image loading, or canvas export fails
 */
export async function svgElementToPngBase64(
  svgElement: SVGElement,
  size: number = 512
): Promise<string> {
  // Step 1: Serialize the SVG element to a string
  let svgString: string
  try {
    const serializer = new XMLSerializer()
    svgString = serializer.serializeToString(svgElement)
  } catch (err) {
    throw new Error(
      `Gagal melakukan serialisasi elemen SVG: ${err instanceof Error ? err.message : String(err)}`
    )
  }

  // Step 2: Create a data URL from the SVG string
  // Use base64 encoding to safely handle any SVG content
  let svgDataUrl: string
  try {
    svgDataUrl = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgString)))}`
  } catch (err) {
    throw new Error(
      `Gagal membuat data URL dari SVG: ${err instanceof Error ? err.message : String(err)}`
    )
  }

  // Step 3 & 4: Load the SVG data URL into an Image and draw onto a canvas
  return new Promise<string>((resolve, reject) => {
    const img = new Image()

    img.onload = () => {
      try {
        // Step 5: Create a canvas and draw the image
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Gagal mendapatkan konteks 2D dari canvas'))
          return
        }

        ctx.drawImage(img, 0, 0, size, size)

        // Step 6: Export canvas to PNG data URL
        const pngDataUrl = canvas.toDataURL('image/png')

        // Step 7: Strip the data URL prefix to get the raw base64 string
        const prefix = 'data:image/png;base64,'
        if (!pngDataUrl.startsWith(prefix)) {
          reject(new Error('Format data URL PNG tidak valid'))
          return
        }

        resolve(pngDataUrl.slice(prefix.length))
      } catch (err) {
        reject(
          new Error(
            `Gagal mengkonversi SVG ke PNG: ${err instanceof Error ? err.message : String(err)}`
          )
        )
      }
    }

    img.onerror = () => {
      reject(new Error('Gagal memuat gambar SVG untuk konversi ke PNG'))
    }

    img.src = svgDataUrl
  })
}

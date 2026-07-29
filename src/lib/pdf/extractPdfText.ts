export interface PdfExtractResult {
  text: string
  hasEmbeddedText: boolean
}

// pdfjs-dist is ~650KB — loaded on demand so users who never upload a PDF
// never pay for it in the initial app load.
async function getPdfjs() {
  const [pdfjs, workerSrcModule] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ])
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrcModule.default
  return pdfjs
}

// Most digital invoices/PDFs have a real text layer — reading it directly is
// far faster and more accurate than OCR, and needs no image rendering at all.
export async function extractPdfText(blob: Blob): Promise<PdfExtractResult> {
  const pdfjs = await getPdfjs()
  const buffer = await blob.arrayBuffer()
  const pdf = await pdfjs.getDocument({ data: buffer }).promise
  const page = await pdf.getPage(1)
  const textContent = await page.getTextContent()

  // pdf.js gives flat text runs with no line breaks — rebuild lines by
  // watching the vertical position (transform[5]) jump between runs, the
  // same way the layout visually breaks into rows. Without this every
  // field-parser that relies on splitting by '\n' (e.g. vendor detection)
  // would see the whole page as a single line.
  let text = ''
  let lastY: number | null = null
  for (const item of textContent.items) {
    if (!('str' in item)) continue
    const y = item.transform[5]
    if (lastY !== null && Math.abs(y - lastY) > 2) {
      text += '\n'
    } else if (text.length > 0) {
      text += ' '
    }
    text += item.str
    lastY = y
  }
  text = text.trim()

  return { text, hasEmbeddedText: text.length > 20 }
}

// Fallback for scanned PDFs with no text layer: render page 1 to an image so
// it can go through the same Tesseract OCR pipeline as a camera photo.
export async function renderPdfPageToBlob(blob: Blob): Promise<Blob> {
  const pdfjs = await getPdfjs()
  const buffer = await blob.arrayBuffer()
  const pdf = await pdfjs.getDocument({ data: buffer }).promise
  const page = await pdf.getPage(1)
  const viewport = page.getViewport({ scale: 2 })

  const canvas = document.createElement('canvas')
  canvas.width = viewport.width
  canvas.height = viewport.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No se pudo renderizar el PDF')

  await page.render({ canvasContext: ctx, viewport, canvas }).promise

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('No se pudo generar la imagen del PDF'))),
      'image/jpeg',
      0.9,
    )
  })
}

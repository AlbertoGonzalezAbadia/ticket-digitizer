import { createWorker, PSM, type Worker } from 'tesseract.js'

export interface OcrResult {
  text: string
  confidence: number
}

let workerPromise: Promise<Worker> | null = null

// The OCR engine (worker script + WASM core) is self-hosted under
// /tesseract so recognition never depends on a third-party service.
// Tickets come in Spanish, English, and French, so all three language
// packs are loaded together — Tesseract considers all of them per scan,
// which handles mixed-language receipts far better than guessing one.
// Only the language data itself comes from tesseract.js's CDN on first
// use; tesseract.js caches it afterwards, so scans work fully offline
// from the second use onward.
function getWorker() {
  if (!workerPromise) {
    workerPromise = createWorker('spa+eng+fra', 1, {
      workerPath: '/tesseract/worker.min.js',
      corePath: '/tesseract/core/',
    }).then(async (worker) => {
      // Real receipts are a single column of text with wildly varying font
      // sizes (tiny line items next to a huge bold total) — Tesseract's
      // default auto-segmentation can lose whole lines when a size jump
      // confuses it. SINGLE_COLUMN handles that layout far more reliably.
      await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_COLUMN })
      return worker
    })
    // If init fails (e.g. a flaky first fetch of the language data), don't
    // leave the whole session permanently stuck on a rejected promise —
    // every future capture would silently skip OCR. Clearing it lets the
    // next capture try again from scratch.
    workerPromise.catch(() => {
      workerPromise = null
    })
  }
  return workerPromise
}

export async function recognizeTicket(image: Blob): Promise<OcrResult> {
  const worker = await getWorker()
  const {
    data: { text, confidence },
  } = await worker.recognize(image)
  return { text, confidence }
}

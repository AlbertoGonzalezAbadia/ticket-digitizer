import type { ParsedField } from './types'

// Lines that are purely numbers/dates/amounts/symbols are never the vendor name.
const NON_VENDOR_LINE = /^[\d\s/\-.,:€%]+$/

// Photos that include background around the ticket (table, hands, etc.)
// often produce garbled OCR noise before the real receipt text — strings of
// short, disconnected fragments rather than a real name. A genuine vendor
// name almost always contains at least one real word of some length (shop
// name, "SL"/"SA" aside); garbage lines rarely do.
function looksLikeGarbage(line: string): boolean {
  const words = line.match(/[a-zA-ZÀ-ÿ]+/g) ?? []
  const longestWord = Math.max(0, ...words.map((w) => w.length))
  return longestWord < 4
}

export function parseVendor(text: string): ParsedField<string> {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length === 0) return { value: null, confidence: 'low' }

  // The vendor name is almost always near the top of the printed ticket,
  // but garbage lines from background noise can push it down a few lines.
  for (const line of lines.slice(0, 8)) {
    if (line.length >= 3 && !NON_VENDOR_LINE.test(line) && !looksLikeGarbage(line)) {
      return { value: line, confidence: 'high' }
    }
  }

  return { value: lines[0], confidence: 'low' }
}

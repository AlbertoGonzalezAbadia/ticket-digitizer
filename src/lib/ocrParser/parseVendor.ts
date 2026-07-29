import type { ParsedField } from './types'

// Lines that are purely numbers/dates/amounts/symbols are never the vendor name.
const NON_VENDOR_LINE = /^[\d\s/\-.,:€%]+$/

export function parseVendor(text: string): ParsedField<string> {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length === 0) return { value: null, confidence: 'low' }

  // The vendor name is almost always in the first couple of printed lines.
  for (const line of lines.slice(0, 3)) {
    if (line.length >= 3 && !NON_VENDOR_LINE.test(line)) {
      return { value: line, confidence: 'high' }
    }
  }

  return { value: lines[0], confidence: 'low' }
}

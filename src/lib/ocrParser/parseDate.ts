import type { ParsedField } from './types'

const DATE_PATTERNS = [/\b(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})\b/, /\b(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2})\b/]

// Returns an ISO (YYYY-MM-DD) string so it plugs directly into <input type="date">.
export function parseDate(text: string): ParsedField<string> {
  for (const pattern of DATE_PATTERNS) {
    const match = text.match(pattern)
    if (!match) continue
    const [, day, month, yearRaw] = match
    const year = yearRaw.length === 2 ? `20${yearRaw}` : yearRaw
    const iso = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
    const parsed = new Date(iso)
    if (!Number.isNaN(parsed.getTime())) {
      return { value: iso, confidence: 'high' }
    }
  }
  return { value: null, confidence: 'low' }
}

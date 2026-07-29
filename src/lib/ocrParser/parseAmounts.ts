import type { ParsedField } from './types'

const TOTAL_LINE = /TOTAL[^\d]{0,15}(\d{1,4}[.,]\d{2})/i
const ANY_AMOUNT = /(\d{1,4}[.,]\d{2})\s?(?:€|EUR)?/g

function toNumber(raw: string): number {
  return parseFloat(raw.replace(',', '.'))
}

export function parseTotal(text: string): ParsedField<number> {
  const totalMatch = text.match(TOTAL_LINE)
  if (totalMatch) {
    return { value: toNumber(totalMatch[1]), confidence: 'high' }
  }

  // Fallback: the total is usually the largest amount printed on the ticket.
  const amounts = [...text.matchAll(ANY_AMOUNT)].map((m) => toNumber(m[1]))
  if (amounts.length > 0) {
    return { value: Math.max(...amounts), confidence: 'low' }
  }

  return { value: null, confidence: 'low' }
}

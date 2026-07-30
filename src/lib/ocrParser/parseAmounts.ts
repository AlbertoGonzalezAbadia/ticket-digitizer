import type { ParsedField } from './types'

// {0,20} (not {0,15}) so phrasings like "TOTAL VENTE TTC :   18,70" (a
// real French receipt format) don't overrun the gap and fall through to
// the less reliable Math.max fallback below.
const TOTAL_LINE = /TOTAL[^\d]{0,20}(\d{1,4}[.,]\d{2})/i
// Excludes numbers immediately followed by '%' — those are tax rates
// (e.g. "TVA 20,00%"), not monetary amounts. Without this, a receipt
// with a 20% VAT line and no matchable "TOTAL" keyword picks "20,00" as
// the Math.max fallback "total" even when the real total (e.g. 18,70) is
// smaller — a rate outranking the actual amount.
//
// Also excludes numbers that are part of a longer dot/comma-separated
// digit chain — a phone number like "09.87.73.42.272" contains "73.42",
// which looks exactly like a price and can outrank the real total in the
// Math.max fallback. The lookbehind/lookahead require the amount to be
// a standalone token, not embedded mid-chain.
const ANY_AMOUNT = /(?<![\d.,])(\d{1,4}[.,]\d{2})(?!\s?%)(?![.,]\d)\s?(?:€|EUR)?/g

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

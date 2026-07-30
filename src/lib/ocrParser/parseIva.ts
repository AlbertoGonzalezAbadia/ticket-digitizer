import type { ParsedField } from './types'
import type { IvaLine } from '../../types/ticket'

const TAX_KEYWORD = '(?:IVA|TVA|VAT)'
// French POS systems commonly print whole-number rates with two decimals
// ("20,00%"), not just one ("5,5%") — both must be accepted.
const RATE = '\\d{1,2}(?:[.,]\\d{1,2})?'
// "IVA 21%: 11,01" / "TVA 10% 6.90" — rate printed before the amount.
const RATE_THEN_AMOUNT = new RegExp(
  `${TAX_KEYWORD}\\s*(${RATE})\\s*%[^\\d\\n]{0,15}(\\d{1,4}[.,]\\d{2})`,
  'gi',
)
// "0.63 TVA 10%" — amount printed before the rate (seen on real receipts).
const AMOUNT_THEN_RATE = new RegExp(
  `(\\d{1,4}[.,]\\d{2})[^\\d\\n]{0,4}${TAX_KEYWORD}\\s*(${RATE})\\s*%`,
  'gi',
)
const PERCENT_ONLY = new RegExp(`${TAX_KEYWORD}\\s*(${RATE})\\s*%`, 'gi')

function toNumber(raw: string): number {
  return parseFloat(raw.replace(',', '.'))
}

// A single ticket can carry more than one tax rate (e.g. supermarket items
// taxed at both 21% and 10%), so this returns every distinct rate found
// rather than just the first — 'high' confidence when an amount was found
// alongside a rate, 'low' when only a bare rate was detected (or nothing).
export function parseIva(text: string): ParsedField<IvaLine[]> {
  const lines: IvaLine[] = []
  const seenPercents = new Set<number>()

  // AMOUNT_THEN_RATE runs first: on lines like "0.63 TVA 10% 6.90" (tax
  // amount, then rate, then the item's gross price) both patterns can
  // match the same "TVA 10%" — RATE_THEN_AMOUNT would wrongly grab the
  // trailing gross price as if it were the tax amount, so the tighter,
  // more specific pattern (amount immediately before the keyword) wins.
  for (const match of text.matchAll(AMOUNT_THEN_RATE)) {
    const percent = toNumber(match[2])
    if (seenPercents.has(percent)) continue
    seenPercents.add(percent)
    lines.push({ percent, amount: toNumber(match[1]) })
  }

  for (const match of text.matchAll(RATE_THEN_AMOUNT)) {
    const percent = toNumber(match[1])
    if (seenPercents.has(percent)) continue
    seenPercents.add(percent)
    lines.push({ percent, amount: toNumber(match[2]) })
  }

  if (lines.length > 0) {
    return { value: lines, confidence: 'high' }
  }

  // No amount alongside a rate — still surface the rate(s) so the user
  // only has to type in the amount, not hunt for the rate too.
  for (const match of text.matchAll(PERCENT_ONLY)) {
    const percent = toNumber(match[1])
    if (seenPercents.has(percent)) continue
    seenPercents.add(percent)
    lines.push({ percent, amount: null })
  }

  return { value: lines, confidence: 'low' }
}

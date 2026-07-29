import type { ParsedField } from './types'

export interface IvaResult {
  percent: number | null
  amount: number | null
}

const IVA_LINE = /IVA\s*(\d{1,2}(?:[.,]\d)?)\s*%[^\d]{0,15}(\d{1,4}[.,]\d{2})/i
const IVA_PERCENT_ONLY = /IVA\s*(\d{1,2}(?:[.,]\d)?)\s*%/i

function toNumber(raw: string): number {
  return parseFloat(raw.replace(',', '.'))
}

export function parseIva(text: string): ParsedField<IvaResult> {
  const full = text.match(IVA_LINE)
  if (full) {
    return {
      value: { percent: toNumber(full[1]), amount: toNumber(full[2]) },
      confidence: 'high',
    }
  }

  const percentOnly = text.match(IVA_PERCENT_ONLY)
  if (percentOnly) {
    return { value: { percent: toNumber(percentOnly[1]), amount: null }, confidence: 'low' }
  }

  return { value: { percent: null, amount: null }, confidence: 'low' }
}

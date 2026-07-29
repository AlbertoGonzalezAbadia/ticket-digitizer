import { parseDate } from './parseDate'
import { parseTotal } from './parseAmounts'
import { parseIva, type IvaResult } from './parseIva'
import { parseVendor } from './parseVendor'
import type { ParsedField } from './types'

export interface ParsedTicketFields {
  date: ParsedField<string>
  vendor: ParsedField<string>
  total: ParsedField<number>
  iva: ParsedField<IvaResult>
}

export function parseTicketText(text: string): ParsedTicketFields {
  return {
    date: parseDate(text),
    vendor: parseVendor(text),
    total: parseTotal(text),
    iva: parseIva(text),
  }
}

export type { ParsedField, IvaResult }

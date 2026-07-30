import { parseDate } from './parseDate'
import { parseTotal } from './parseAmounts'
import { parseIva } from './parseIva'
import { parseVendor } from './parseVendor'
import type { ParsedField } from './types'
import type { IvaLine } from '../../types/ticket'

export interface ParsedTicketFields {
  date: ParsedField<string>
  vendor: ParsedField<string>
  total: ParsedField<number>
  iva: ParsedField<IvaLine[]>
}

export function parseTicketText(text: string): ParsedTicketFields {
  return {
    date: parseDate(text),
    vendor: parseVendor(text),
    total: parseTotal(text),
    iva: parseIva(text),
  }
}

export type { ParsedField }

export type TicketStatus =
  | 'captured'
  | 'confirmed'
  | 'pending_sync'
  | 'synced'
  | 'error'

export const TICKET_CATEGORIES = [
  'Suministros',
  'Material',
  'Dietas',
  'Transporte',
  'Otros',
] as const

export type TicketCategory = (typeof TICKET_CATEGORIES)[number]

// Preset recipients get their own Drive folder tree; anything else is a
// free-typed recipient name (also gets its own folder, just not preset).
export const RECIPIENT_PRESETS = ['Elliard'] as const

// A single ticket can carry more than one tax rate (e.g. a supermarket
// receipt with 21% and 10% items on the same slip), and not every rate is
// the Spanish 21% default — so tax is a list, not a single percent/amount.
export interface IvaLine {
  percent: number | null
  amount: number | null
}

export interface TicketFields {
  date: string | null
  vendor: string | null
  total: number | null
  ivaLines: IvaLine[]
  category: TicketCategory | null
  recipient: string | null
}

export interface Ticket {
  id: string
  status: TicketStatus
  createdAt: string
  imageBlob: Blob
  ocrText?: string
  ocrConfidence?: number
  fields?: TicketFields
}

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

export interface TicketFields {
  date: string | null
  vendor: string | null
  total: number | null
  ivaPercent: number | null
  ivaAmount: number | null
  category: TicketCategory | null
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

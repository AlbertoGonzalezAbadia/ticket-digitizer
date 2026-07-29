export type TicketStatus =
  | 'captured'
  | 'confirmed'
  | 'pending_sync'
  | 'synced'
  | 'error'

export interface Ticket {
  id: string
  status: TicketStatus
  createdAt: string
  imageBlob: Blob
  ocrText?: string
  ocrConfidence?: number
}

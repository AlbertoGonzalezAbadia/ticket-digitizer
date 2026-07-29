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
}

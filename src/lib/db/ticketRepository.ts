import { getDb, TICKETS_STORE } from './indexedDb'
import type { Ticket } from '../../types/ticket'

export async function addCapturedTicket(imageBlob: Blob): Promise<Ticket> {
  const ticket: Ticket = {
    id: crypto.randomUUID(),
    status: 'captured',
    createdAt: new Date().toISOString(),
    imageBlob,
  }
  const db = await getDb()
  await db.put(TICKETS_STORE, ticket)
  return ticket
}

export async function getAllTickets(): Promise<Ticket[]> {
  const db = await getDb()
  const tickets = await db.getAllFromIndex(TICKETS_STORE, 'by-createdAt')
  return tickets.reverse()
}

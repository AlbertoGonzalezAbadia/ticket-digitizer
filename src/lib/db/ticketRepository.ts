import { getDb, TICKETS_STORE } from './indexedDb'
import type { Ticket, TicketFields } from '../../types/ticket'

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

export async function updateTicketOcr(
  id: string,
  ocrText: string,
  ocrConfidence: number,
): Promise<void> {
  const db = await getDb()
  const ticket = await db.get(TICKETS_STORE, id)
  if (!ticket) return
  await db.put(TICKETS_STORE, { ...ticket, ocrText, ocrConfidence })
}

export async function confirmTicket(id: string, fields: TicketFields): Promise<void> {
  const db = await getDb()
  const ticket = await db.get(TICKETS_STORE, id)
  if (!ticket) return
  await db.put(TICKETS_STORE, { ...ticket, fields, status: 'confirmed' })
}

export async function deleteTicket(id: string): Promise<void> {
  const db = await getDb()
  await db.delete(TICKETS_STORE, id)
}

import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Ticket } from '../../types/ticket'

interface TicketDb extends DBSchema {
  tickets: {
    key: string
    value: Ticket
    indexes: { 'by-createdAt': string }
  }
}

const DB_NAME = 'ticket-digitizer'
const DB_VERSION = 1
const TICKETS_STORE = 'tickets'

let dbPromise: Promise<IDBPDatabase<TicketDb>> | null = null

export function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<TicketDb>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const store = db.createObjectStore(TICKETS_STORE, { keyPath: 'id' })
        store.createIndex('by-createdAt', 'createdAt')
      },
    })
  }
  return dbPromise
}

export { TICKETS_STORE }

import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Ticket } from '../../types/ticket'

interface CustomRecipient {
  name: string
  createdAt: string
}

interface TicketDb extends DBSchema {
  tickets: {
    key: string
    value: Ticket
    indexes: { 'by-createdAt': string }
  }
  recipients: {
    key: string
    value: CustomRecipient
  }
}

const DB_NAME = 'ticket-digitizer'
const DB_VERSION = 2
const TICKETS_STORE = 'tickets'
const RECIPIENTS_STORE = 'recipients'

let dbPromise: Promise<IDBPDatabase<TicketDb>> | null = null

export function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<TicketDb>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          const store = db.createObjectStore(TICKETS_STORE, { keyPath: 'id' })
          store.createIndex('by-createdAt', 'createdAt')
        }
        if (oldVersion < 2) {
          db.createObjectStore(RECIPIENTS_STORE, { keyPath: 'name' })
        }
      },
    })
  }
  return dbPromise
}

export { TICKETS_STORE, RECIPIENTS_STORE }
export type { CustomRecipient }

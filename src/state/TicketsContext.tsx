import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Ticket, TicketFields } from '../types/ticket'
import {
  addCapturedTicket,
  confirmTicket as confirmTicketInDb,
  deleteTicket as deleteTicketInDb,
  getAllTickets,
  markTicketSynced,
  markTicketSyncError,
  updateTicketOcr,
} from '../lib/db/ticketRepository'
import { prepareCapturedImage } from '../lib/image/prepareImage'
import { recognizeTicket } from '../lib/ocr/tesseractClient'
import { ensureAccessToken } from '../lib/google/auth'
import { syncTicket } from '../lib/sync/syncTicket'

interface TicketsContextValue {
  tickets: Ticket[]
  pendingCount: number
  loading: boolean
  /** Saves the photo, runs OCR, and resolves once the ticket is ready to confirm. */
  captureTicket: (file: File) => Promise<string>
  confirmTicket: (id: string, fields: TicketFields) => Promise<void>
  discardTicket: (id: string) => Promise<void>
  /** Must be called from a user gesture — may trigger the Google sign-in popup. */
  syncTicketNow: (id: string) => Promise<void>
}

const TicketsContext = createContext<TicketsContextValue | null>(null)

export function TicketsProvider({ children }: { children: ReactNode }) {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setTickets(await getAllTickets())
  }, [])

  useEffect(() => {
    refresh().finally(() => setLoading(false))
  }, [refresh])

  const captureTicket = useCallback(
    async (file: File) => {
      const imageBlob = await prepareCapturedImage(file)
      const ticket = await addCapturedTicket(imageBlob)
      await refresh()

      try {
        const { text, confidence } = await recognizeTicket(imageBlob)
        await updateTicketOcr(ticket.id, text, confidence)
      } catch {
        // Leave the ticket without OCR text; the Confirm screen still lets
        // the user fill fields in by hand when recognition fails.
      }
      await refresh()

      return ticket.id
    },
    [refresh],
  )

  const confirmTicket = useCallback(
    async (id: string, fields: TicketFields) => {
      await confirmTicketInDb(id, fields)
      await refresh()
    },
    [refresh],
  )

  const discardTicket = useCallback(
    async (id: string) => {
      await deleteTicketInDb(id)
      await refresh()
    },
    [refresh],
  )

  const syncTicketNow = useCallback(
    async (id: string) => {
      const ticket = tickets.find((t) => t.id === id)
      if (!ticket) return
      try {
        await ensureAccessToken()
        await syncTicket(ticket)
        await markTicketSynced(id)
      } catch {
        await markTicketSyncError(id)
      }
      await refresh()
    },
    [tickets, refresh],
  )

  const pendingCount = tickets.filter((t) => t.status !== 'synced').length

  return (
    <TicketsContext.Provider
      value={{
        tickets,
        pendingCount,
        loading,
        captureTicket,
        confirmTicket,
        discardTicket,
        syncTicketNow,
      }}
    >
      {children}
    </TicketsContext.Provider>
  )
}

export function useTickets() {
  const ctx = useContext(TicketsContext)
  if (!ctx) throw new Error('useTickets must be used within TicketsProvider')
  return ctx
}

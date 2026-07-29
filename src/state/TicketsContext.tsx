import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Ticket } from '../types/ticket'
import { addCapturedTicket, getAllTickets, updateTicketOcr } from '../lib/db/ticketRepository'
import { prepareCapturedImage } from '../lib/image/prepareImage'
import { recognizeTicket } from '../lib/ocr/tesseractClient'

interface TicketsContextValue {
  tickets: Ticket[]
  pendingCount: number
  loading: boolean
  captureTicket: (file: File) => Promise<void>
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

  const runOcr = useCallback(
    async (ticketId: string, imageBlob: Blob) => {
      try {
        const { text, confidence } = await recognizeTicket(imageBlob)
        await updateTicketOcr(ticketId, text, confidence)
      } catch {
        // Leave the ticket without OCR text; the Confirm screen (M4) lets
        // the user fill fields in by hand when recognition fails.
      } finally {
        await refresh()
      }
    },
    [refresh],
  )

  const captureTicket = useCallback(
    async (file: File) => {
      const imageBlob = await prepareCapturedImage(file)
      const ticket = await addCapturedTicket(imageBlob)
      await refresh()
      void runOcr(ticket.id, imageBlob)
    },
    [refresh, runOcr],
  )

  const pendingCount = tickets.filter((t) => t.status !== 'synced').length

  return (
    <TicketsContext.Provider value={{ tickets, pendingCount, loading, captureTicket }}>
      {children}
    </TicketsContext.Provider>
  )
}

export function useTickets() {
  const ctx = useContext(TicketsContext)
  if (!ctx) throw new Error('useTickets must be used within TicketsProvider')
  return ctx
}

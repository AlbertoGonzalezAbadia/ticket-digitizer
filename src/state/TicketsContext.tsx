import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Ticket, TicketFields } from '../types/ticket'
import {
  addCapturedTicket,
  confirmTicket as confirmTicketInDb,
  deleteAllTickets as deleteAllTicketsInDb,
  deleteTicket as deleteTicketInDb,
  getAllTickets,
  markTicketSynced,
  markTicketSyncError,
  updateTicketOcr,
} from '../lib/db/ticketRepository'
import { prepareCapturedImage } from '../lib/image/prepareImage'
import { recognizeTicket } from '../lib/ocr/tesseractClient'
import { extractPdfText, renderPdfPageToBlob } from '../lib/pdf/extractPdfText'
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
  /** Local-only wipe of every ticket — never touches Drive/Sheets. */
  deleteAllTickets: () => Promise<void>
  /** Must be called from a user gesture — may trigger the Google sign-in popup. */
  syncTicketNow: (id: string) => Promise<void>
  /** Syncs every confirmed/error ticket, one at a time. Same user-gesture requirement as syncTicketNow. */
  syncAllPending: () => Promise<void>
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
      const isPdf = file.type === 'application/pdf'
      // A digital PDF invoice needs no downscale/reorientation — only a
      // camera photo does.
      const storedBlob = isPdf ? file : await prepareCapturedImage(file)

      const ticket = await addCapturedTicket(storedBlob)
      await refresh()

      try {
        let text: string
        let confidence: number
        if (isPdf) {
          const extracted = await extractPdfText(storedBlob)
          if (extracted.hasEmbeddedText) {
            // Real text layer — no OCR needed, and it's fully accurate.
            text = extracted.text
            confidence = 100
          } else {
            // Scanned PDF with no text layer: fall back to rendering the
            // page and running it through the same OCR as a photo.
            const rendered = await renderPdfPageToBlob(storedBlob)
            const result = await recognizeTicket(rendered)
            text = result.text
            confidence = result.confidence
          }
        } else {
          const result = await recognizeTicket(storedBlob)
          text = result.text
          confidence = result.confidence
        }
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

  const deleteAllTickets = useCallback(async () => {
    await deleteAllTicketsInDb()
    await refresh()
  }, [refresh])

  const syncOne = useCallback(async (ticket: Ticket) => {
    try {
      await ensureAccessToken()
      await syncTicket(ticket)
      await markTicketSynced(ticket.id)
    } catch {
      await markTicketSyncError(ticket.id)
    }
  }, [])

  const syncTicketNow = useCallback(
    async (id: string) => {
      const ticket = tickets.find((t) => t.id === id)
      if (!ticket) return
      await syncOne(ticket)
      await refresh()
    },
    [tickets, syncOne, refresh],
  )

  const syncAllPending = useCallback(async () => {
    // Snapshot up front — sequential, not parallel, so syncs don't race
    // each other creating the same Drive folder/spreadsheet twice, and one
    // failure doesn't abort the rest.
    const pending = tickets.filter((t) => t.status === 'confirmed' || t.status === 'error')
    for (const ticket of pending) {
      await syncOne(ticket)
    }
    await refresh()
  }, [tickets, syncOne, refresh])

  // 'captured' tickets aren't sync-eligible yet — they need confirmation
  // first — so counting them here would overstate what's actually waiting
  // on Google as "pending sync".
  const pendingCount = tickets.filter((t) => t.status === 'confirmed' || t.status === 'error').length

  return (
    <TicketsContext.Provider
      value={{
        tickets,
        pendingCount,
        loading,
        captureTicket,
        confirmTicket,
        discardTicket,
        deleteAllTickets,
        syncTicketNow,
        syncAllPending,
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

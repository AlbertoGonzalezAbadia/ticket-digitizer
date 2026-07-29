import { useEffect, useState } from 'react'
import { useTickets } from '../state/TicketsContext'
import type { Ticket } from '../types/ticket'

const STATUS_LABEL: Record<Ticket['status'], string> = {
  captured: 'Capturado',
  confirmed: 'Confirmado',
  pending_sync: 'Pendiente de sincronizar',
  synced: 'Sincronizado',
  error: 'Error',
}

function OcrStatus({ ticket }: { ticket: Ticket }) {
  const [expanded, setExpanded] = useState(false)

  if (ticket.ocrText === undefined) {
    return <p className="text-xs text-teal-900/50">Analizando texto...</p>
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="text-xs font-medium text-teal-700 underline underline-offset-2"
      >
        {expanded ? 'Ocultar texto OCR' : 'Ver texto OCR'}
      </button>
      {expanded && (
        <pre className="mt-1 max-h-40 overflow-y-auto whitespace-pre-wrap rounded-lg bg-teal-50 p-2 text-xs text-teal-900/80">
          {ticket.ocrText || '(sin texto detectado)'}
        </pre>
      )}
    </div>
  )
}

function TicketRow({ ticket }: { ticket: Ticket }) {
  const [imageUrl, setImageUrl] = useState<string | null>(null)

  useEffect(() => {
    const url = URL.createObjectURL(ticket.imageBlob)
    setImageUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [ticket.imageBlob])

  const date = new Date(ticket.createdAt)

  return (
    <li className="flex items-start gap-3 rounded-xl border border-teal-100 bg-white p-3">
      {imageUrl && (
        <img src={imageUrl} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-teal-950">
          {date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}{' '}
          {date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
        </p>
        <p className="mb-1 text-xs text-teal-900/50">{STATUS_LABEL[ticket.status]}</p>
        <OcrStatus ticket={ticket} />
      </div>
    </li>
  )
}

export function HistoryScreen() {
  const { tickets, loading } = useTickets()

  return (
    <div className="flex h-full flex-col px-6 py-8">
      <h1 className="mb-6 text-lg font-semibold text-teal-950">Historial</h1>

      {loading ? (
        <p className="text-center text-sm text-teal-900/50">Cargando...</p>
      ) : tickets.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-teal-900/50">
          <p>Todavía no hay tickets guardados.</p>
          <p className="text-sm">Los tickets que escanees aparecerán aquí.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2 overflow-y-auto">
          {tickets.map((ticket) => (
            <TicketRow key={ticket.id} ticket={ticket} />
          ))}
        </ul>
      )}
    </div>
  )
}

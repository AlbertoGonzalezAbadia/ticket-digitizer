import { useEffect, useState } from 'react'
import { useTickets } from '../state/TicketsContext'
import { Button } from '../components/Button'
import type { Ticket } from '../types/ticket'

const STATUS_LABEL: Record<Ticket['status'], string> = {
  captured: 'Capturado',
  confirmed: 'Confirmado',
  pending_sync: 'Pendiente de sincronizar',
  synced: 'Sincronizado',
  error: 'Error al sincronizar',
}

function formatDate(iso: string) {
  const date = new Date(iso)
  return `${date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })} ${date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`
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

function SyncButton({ ticket }: { ticket: Ticket }) {
  const { syncTicketNow } = useTickets()
  const [syncing, setSyncing] = useState(false)

  if (ticket.status !== 'confirmed' && ticket.status !== 'error') return null

  const handleClick = async () => {
    setSyncing(true)
    await syncTicketNow(ticket.id)
    setSyncing(false)
  }

  return (
    <Button onClick={handleClick} disabled={syncing} className="mt-2 px-3 py-1.5 text-xs">
      {syncing ? 'Sincronizando...' : ticket.status === 'error' ? 'Reintentar' : 'Sincronizar'}
    </Button>
  )
}

function TicketRow({ ticket }: { ticket: Ticket }) {
  const [imageUrl, setImageUrl] = useState<string | null>(null)

  useEffect(() => {
    const url = URL.createObjectURL(ticket.imageBlob)
    setImageUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [ticket.imageBlob])

  const { fields } = ticket
  const hasFields = ticket.status !== 'captured' && fields

  return (
    <li className="flex items-start gap-3 rounded-xl border border-teal-100 bg-white p-3">
      {imageUrl && (
        <img src={imageUrl} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
      )}
      <div className="min-w-0 flex-1">
        {hasFields ? (
          <>
            <p className="truncate text-sm font-medium text-teal-950">
              {fields.vendor || 'Sin proveedor'}
            </p>
            <p className="text-xs text-teal-900/60">
              {fields.total !== null ? `${fields.total.toFixed(2)} €` : 'Sin importe'}
              {fields.date ? ` · ${fields.date}` : ''}
              {fields.category ? ` · ${fields.category}` : ''}
            </p>
          </>
        ) : (
          <p className="truncate text-sm font-medium text-teal-950">{formatDate(ticket.createdAt)}</p>
        )}
        <p className={`mb-1 text-xs ${ticket.status === 'error' ? 'text-red-600' : 'text-teal-900/50'}`}>
          {STATUS_LABEL[ticket.status]}
        </p>
        <OcrStatus ticket={ticket} />
        <SyncButton ticket={ticket} />
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

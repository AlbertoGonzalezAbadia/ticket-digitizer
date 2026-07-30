import { useEffect, useMemo, useState } from 'react'
import { Button } from '../components/Button'
import { useTickets } from '../state/TicketsContext'
import { parseTicketText } from '../lib/ocrParser'
import {
  RECIPIENT_PRESETS,
  TICKET_CATEGORIES,
  type TicketCategory,
  type TicketFields,
} from '../types/ticket'

interface ConfirmScreenProps {
  ticketId: string
  onDone: () => void
}

const OTHER_RECIPIENT = 'Otro'

interface FormState {
  date: string
  vendor: string
  total: string
  ivaPercent: string
  ivaAmount: string
  category: TicketCategory | ''
  recipientChoice: string
  recipientCustom: string
}

const fieldClass = (lowConfidence: boolean) =>
  `w-full rounded-xl border px-3 py-2.5 text-base text-teal-950 focus:outline-none focus:ring-2 focus:ring-teal-500 ${
    lowConfidence ? 'border-amber-400 bg-amber-50' : 'border-teal-200 bg-white'
  }`

export function ConfirmScreen({ ticketId, onDone }: ConfirmScreenProps) {
  const { tickets, confirmTicket, discardTicket } = useTickets()
  const ticket = tickets.find((t) => t.id === ticketId)

  const parsed = useMemo(() => parseTicketText(ticket?.ocrText ?? ''), [ticket?.ocrText])

  const [form, setForm] = useState<FormState>({
    date: parsed.date.value ?? '',
    vendor: parsed.vendor.value ?? '',
    total: parsed.total.value !== null ? String(parsed.total.value) : '',
    ivaPercent: parsed.iva.value?.percent != null ? String(parsed.iva.value.percent) : '',
    ivaAmount: parsed.iva.value?.amount != null ? String(parsed.iva.value.amount) : '',
    category: '',
    recipientChoice: '',
    recipientCustom: '',
  })
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!ticket) return
    const url = URL.createObjectURL(ticket.imageBlob)
    setImageUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [ticket])

  if (!ticket) {
    return null
  }

  const isPdf = ticket.imageBlob.type === 'application/pdf'

  const update = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleSave = async () => {
    setSaving(true)
    const recipient =
      form.recipientChoice === OTHER_RECIPIENT
        ? form.recipientCustom.trim() || null
        : form.recipientChoice || null
    const fields: TicketFields = {
      date: form.date || null,
      vendor: form.vendor.trim() || null,
      total: form.total ? parseFloat(form.total) : null,
      ivaPercent: form.ivaPercent ? parseFloat(form.ivaPercent) : null,
      ivaAmount: form.ivaAmount ? parseFloat(form.ivaAmount) : null,
      category: form.category || null,
      recipient,
    }
    await confirmTicket(ticketId, fields)
    setSaving(false)
    onDone()
  }

  const handleRetake = async () => {
    await discardTicket(ticketId)
    onDone()
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto px-6 py-6">
      <h1 className="mb-4 text-lg font-semibold text-teal-950">Confirmar ticket</h1>

      {imageUrl && isPdf && (
        <div className="mb-4">
          <embed src={imageUrl} type="application/pdf" className="h-48 w-full rounded-xl bg-teal-50" />
          <a href={imageUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-teal-700 underline">
            Abrir PDF
          </a>
        </div>
      )}
      {imageUrl && !isPdf && (
        <img src={imageUrl} alt="Ticket capturado" className="mb-4 max-h-48 w-full rounded-xl object-contain bg-teal-50" />
      )}

      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-teal-900">Fecha</span>
          <input
            type="date"
            value={form.date}
            onChange={update('date')}
            className={fieldClass(parsed.date.confidence === 'low')}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-teal-900">Proveedor / Comercio</span>
          <input
            type="text"
            value={form.vendor}
            onChange={update('vendor')}
            placeholder="Nombre del comercio"
            className={fieldClass(parsed.vendor.confidence === 'low')}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-teal-900">Total (€)</span>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            value={form.total}
            onChange={update('total')}
            placeholder="0,00"
            className={fieldClass(parsed.total.confidence === 'low')}
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-teal-900">IVA %</span>
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              value={form.ivaPercent}
              onChange={update('ivaPercent')}
              placeholder="21"
              className={fieldClass(parsed.iva.confidence === 'low')}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-teal-900">Importe IVA (€)</span>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              value={form.ivaAmount}
              onChange={update('ivaAmount')}
              placeholder="0,00"
              className={fieldClass(parsed.iva.confidence === 'low')}
            />
          </label>
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-teal-900">Categoría</span>
          <select value={form.category} onChange={update('category')} className={fieldClass(false)}>
            <option value="">Sin categoría</option>
            {TICKET_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-teal-900">Enviar a</span>
          <select value={form.recipientChoice} onChange={update('recipientChoice')} className={fieldClass(false)}>
            <option value="">Sin especificar</option>
            {RECIPIENT_PRESETS.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
            <option value={OTHER_RECIPIENT}>Otro...</option>
          </select>
        </label>

        {form.recipientChoice === OTHER_RECIPIENT && (
          <input
            type="text"
            value={form.recipientCustom}
            onChange={update('recipientCustom')}
            placeholder="Nombre del destinatario"
            className={fieldClass(false)}
          />
        )}
      </div>

      <div className="mt-6 flex flex-col gap-2">
        <Button onClick={handleSave} disabled={saving} className="w-full py-3 text-base">
          {saving ? 'Guardando...' : 'Guardar'}
        </Button>
        <Button variant="secondary" onClick={handleRetake} disabled={saving} className="w-full py-2.5">
          {isPdf ? 'Descartar' : 'Repetir foto'}
        </Button>
      </div>
    </div>
  )
}

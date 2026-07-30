import { useEffect, useMemo, useState } from 'react'
import { Button } from '../components/Button'
import { useTickets } from '../state/TicketsContext'
import { parseTicketText } from '../lib/ocrParser'
import { addCustomRecipient, getCustomRecipients } from '../lib/db/recipientRepository'
import { RECIPIENT_PRESETS, type TicketCategory, type TicketFields } from '../types/ticket'

interface ConfirmScreenProps {
  ticketId: string
  /** 'edit' (reopened from History, before it's synced) must never delete the ticket on cancel. */
  mode: 'capture' | 'edit'
  onDone: () => void
}

const OTHER_RECIPIENT = 'Otro'

interface IvaLineForm {
  percent: string
  amount: string
}

interface FormState {
  date: string
  vendor: string
  total: string
  ivaLines: IvaLineForm[]
  category: TicketCategory | ''
  recipientChoice: string
  recipientCustom: string
}

const fieldClass = (lowConfidence: boolean) =>
  `w-full rounded-xl border px-3 py-2.5 text-base text-teal-950 focus:outline-none focus:ring-2 focus:ring-teal-500 ${
    lowConfidence ? 'border-amber-400 bg-amber-50' : 'border-teal-200 bg-white'
  }`

export function ConfirmScreen({ ticketId, mode, onDone }: ConfirmScreenProps) {
  const { tickets, confirmTicket, discardTicket } = useTickets()
  const ticket = tickets.find((t) => t.id === ticketId)

  const parsed = useMemo(() => parseTicketText(ticket?.ocrText ?? ''), [ticket?.ocrText])

  // Re-opening an already-confirmed ticket (from History's "Editar") must
  // start from what was actually saved, not re-run the OCR guess from
  // scratch — otherwise editing would silently discard prior corrections.
  // Falls back to the freshly-parsed OCR values only for a brand-new,
  // never-confirmed ticket, which has no saved fields yet.
  const [form, setForm] = useState<FormState>(() => {
    const f = ticket?.fields
    const savedIvaLines = f?.ivaLines && f.ivaLines.length > 0 ? f.ivaLines : null
    const recipient = f?.recipient ?? null
    const isPresetRecipient = recipient != null && (RECIPIENT_PRESETS as readonly string[]).includes(recipient)
    return {
      date: f?.date ?? parsed.date.value ?? '',
      vendor: f?.vendor ?? parsed.vendor.value ?? '',
      total: f?.total != null ? String(f.total) : parsed.total.value !== null ? String(parsed.total.value) : '',
      ivaLines: (savedIvaLines ?? parsed.iva.value ?? []).length
        ? (savedIvaLines ?? parsed.iva.value ?? []).map((line) => ({
            percent: line.percent != null ? String(line.percent) : '',
            amount: line.amount != null ? String(line.amount) : '',
          }))
        : [{ percent: '', amount: '' }],
      category: f?.category ?? '',
      recipientChoice: recipient === null ? '' : isPresetRecipient ? recipient : OTHER_RECIPIENT,
      recipientCustom: recipient !== null && !isPresetRecipient ? recipient : '',
    }
  })
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [customRecipients, setCustomRecipients] = useState<string[]>([])

  useEffect(() => {
    if (!ticket) return
    const url = URL.createObjectURL(ticket.imageBlob)
    setImageUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [ticket])

  useEffect(() => {
    getCustomRecipients().then(setCustomRecipients)
  }, [])

  // Presets ("Elliard") plus any custom recipient typed in before (and thus
  // already saved via addCustomRecipient) — so "Otros" only ever offers a
  // free-text box for a genuinely new name, not one already picked once.
  const recipientOptions = useMemo(() => {
    const seen = new Set<string>(RECIPIENT_PRESETS)
    const extra = customRecipients.filter((name) => !seen.has(name))
    return [...RECIPIENT_PRESETS, ...extra]
  }, [customRecipients])

  if (!ticket) {
    return null
  }

  const isPdf = ticket.imageBlob.type === 'application/pdf'

  const update =
    (key: keyof Omit<FormState, 'ivaLines'>) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleSave = async () => {
    setSaving(true)
    const recipient =
      form.recipientChoice === OTHER_RECIPIENT
        ? form.recipientCustom.trim() || null
        : form.recipientChoice || null
    // A newly typed recipient becomes permanent — it'll show up as its own
    // dropdown option next time instead of needing "Otros" again.
    if (recipient && !recipientOptions.includes(recipient)) {
      await addCustomRecipient(recipient)
    }
    const fields: TicketFields = {
      date: form.date || null,
      vendor: form.vendor.trim() || null,
      total: form.total ? parseFloat(form.total) : null,
      ivaLines: form.ivaLines
        .filter((line) => line.percent !== '' || line.amount !== '')
        .map((line) => ({
          percent: line.percent ? parseFloat(line.percent) : null,
          amount: line.amount ? parseFloat(line.amount) : null,
        })),
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

  const handleCancel = () => {
    onDone()
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto px-6 py-6">
      <h1 className="mb-4 text-lg font-semibold text-teal-950">
        {mode === 'edit' ? 'Editar ticket' : 'Confirmar ticket'}
      </h1>

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

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-teal-900">Enviar a</span>
          <select value={form.recipientChoice} onChange={update('recipientChoice')} className={fieldClass(false)}>
            <option value="">Sin especificar</option>
            {recipientOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
            <option value={OTHER_RECIPIENT}>Otros (nuevo)</option>
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
        {mode === 'edit' ? (
          <Button variant="secondary" onClick={handleCancel} disabled={saving} className="w-full py-2.5">
            Cancelar
          </Button>
        ) : (
          <Button variant="secondary" onClick={handleRetake} disabled={saving} className="w-full py-2.5">
            {isPdf ? 'Descartar' : 'Repetir foto'}
          </Button>
        )}
      </div>
    </div>
  )
}

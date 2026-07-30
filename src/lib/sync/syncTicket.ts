import type { Ticket } from '../../types/ticket'
import { uploadImage } from '../google/driveClient'
import { appendTicketRow } from '../google/sheetsClient'
import { resolveDestination, getQuarter } from '../google/folderResolver'

const DIACRITICS = /[\u0300-\u036f]/g

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .normalize('NFD')
      .replace(DIACRITICS, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 40) || 'ticket'
  )
}

export async function syncTicket(ticket: Ticket): Promise<void> {
  const date = ticket.fields?.date ? new Date(ticket.fields.date) : new Date(ticket.createdAt)
  const { folderId, spreadsheetId, year } = await resolveDestination(date, ticket.fields?.recipient ?? null)

  const createdAt = new Date(ticket.createdAt)
  const stamp = createdAt.toISOString().replace(/[-:]/g, '').replace('T', '_').slice(0, 15)
  const vendorSlug = slugify(ticket.fields?.vendor ?? 'ticket')
  const extension = ticket.imageBlob.type === 'application/pdf' ? 'pdf' : 'jpg'
  const fileName = `${stamp}_${vendorSlug}_${ticket.id.slice(0, 8)}.${extension}`

  const { webViewLink } = await uploadImage(fileName, ticket.imageBlob, folderId)

  const f = ticket.fields
  const ivaLines = f?.ivaLines ?? []
  const hasIvaAmounts = ivaLines.some((line) => line.amount != null)
  const ivaTotal = ivaLines.reduce((sum, line) => sum + (line.amount ?? 0), 0)
  const ivaBreakdown = ivaLines
    .map((line) => {
      const pct = line.percent != null ? `${line.percent}%` : '?%'
      const amt = line.amount != null ? `${line.amount.toFixed(2)}€` : '?€'
      return `${pct}: ${amt}`
    })
    .join('; ')
  const base = f?.total != null && hasIvaAmounts ? f.total - ivaTotal : ''
  const row = [
    f?.date ?? '',
    `T${getQuarter(date)}`,
    f?.vendor ?? '',
    '',
    base,
    ivaBreakdown,
    hasIvaAmounts ? ivaTotal : '',
    f?.total ?? '',
    f?.category ?? '',
    webViewLink,
    fileName,
    '',
    ticket.createdAt,
    ticket.ocrConfidence != null && ticket.ocrConfidence < 60 ? 'Revisar' : 'OK',
    f?.recipient ?? '',
  ]
  await appendTicketRow(spreadsheetId, year, row)
}

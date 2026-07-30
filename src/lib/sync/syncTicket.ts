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

// A date-only string like "2026-07-29" parses as UTC midnight per the JS
// spec, but getMonth()/getDate() below read it back in the device's local
// timezone -- anywhere behind UTC, that rolls the date backward a day,
// silently filing the ticket into the wrong month's Drive folder and the
// wrong quarter column. Parsing the components directly keeps it local
// throughout, so no timezone conversion ever happens.
function parseLocalDate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, month - 1, day)
}

// Google Sheets treats USER_ENTERED cell text starting with =, +, -, or @
// as a formula -- needed so numeric columns (totals, IVA) render as real
// numbers the gestor can sum, but it means free-text fields (an OCR-read
// vendor name, or a hand-typed custom recipient) could otherwise be read
// as a formula. A leading apostrophe forces Sheets to treat it as text.
const FORMULA_TRIGGER = /^[=+\-@]/
function sanitizeForSheets(text: string): string {
  return FORMULA_TRIGGER.test(text) ? `'${text}` : text
}

export async function syncTicket(ticket: Ticket): Promise<void> {
  const date = ticket.fields?.date ? parseLocalDate(ticket.fields.date) : new Date(ticket.createdAt)
  const { folderId, spreadsheetIds, year } = await resolveDestination(date, ticket.fields?.recipient ?? null)

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
    f?.vendor ? sanitizeForSheets(f.vendor) : '',
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
    f?.recipient ? sanitizeForSheets(f.recipient) : '',
  ]
  // Written to both the general spreadsheet and the recipient-specific one
  // (see resolveDestination). Note: like the image upload above, this isn't
  // idempotent — if a retry re-runs after one of these writes already
  // succeeded, that row (or image) gets duplicated rather than skipped.
  // Pre-existing limitation, not new here; a real fix needs a dedup check
  // (e.g. by ticket ID) before each write, which is out of scope for now.
  for (const spreadsheetId of spreadsheetIds) {
    await appendTicketRow(spreadsheetId, year, row)
  }
}


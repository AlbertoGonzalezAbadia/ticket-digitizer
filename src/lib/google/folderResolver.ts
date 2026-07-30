import { findOrCreateFolder, findSpreadsheet, createSpreadsheetFile } from './driveClient'
import { ensureYearSheet } from './sheetsClient'

const ROOT_FOLDER_NAME = 'Tickets'
const SPREADSHEET_NAME = 'Tickets - Registro'
const UNSPECIFIED_RECIPIENT_FOLDER = 'Sin especificar'

const SPANISH_MONTHS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

export function getQuarter(date: Date): number {
  return Math.floor(date.getMonth() / 3) + 1
}

// e.g. "07 - Julio" — zero-padded so folders sort correctly in Drive.
export function getMonthFolderName(date: Date): string {
  const monthNumber = String(date.getMonth() + 1).padStart(2, '0')
  return `${monthNumber} - ${SPANISH_MONTHS[date.getMonth()]}`
}

export interface TicketDestination {
  folderId: string
  // Every ticket goes into two spreadsheets: the general one at the Tickets
  // root (every recipient combined) and one scoped to just that recipient's
  // folder — so both "all tickets" and "just Elliard's tickets" exist as
  // ready-to-send Excel files without anyone having to filter/export by hand.
  spreadsheetIds: string[]
  year: string
}

async function findOrCreateSpreadsheet(name: string, parentId: string): Promise<string> {
  const existing = await findSpreadsheet(name, parentId)
  if (existing) return existing
  return createSpreadsheetFile(name, parentId)
}

// Idempotent: re-running this for the same date/recipient never creates
// duplicate folders/spreadsheets — it always finds the existing ones first.
// Folder layout: Tickets/{recipient}/{year}/{month}/ — each recipient
// (Elliard, a custom name, or "Sin especificar") gets its own fully
// separate tree, and its own spreadsheet inside that tree.
export async function resolveDestination(
  ticketDate: Date,
  recipient: string | null,
): Promise<TicketDestination> {
  const year = String(ticketDate.getFullYear())
  const month = getMonthFolderName(ticketDate)
  const recipientFolderName = recipient?.trim() || UNSPECIFIED_RECIPIENT_FOLDER

  const rootFolderId = await findOrCreateFolder(ROOT_FOLDER_NAME)
  const recipientFolderId = await findOrCreateFolder(recipientFolderName, rootFolderId)
  const yearFolderId = await findOrCreateFolder(year, recipientFolderId)
  const monthFolderId = await findOrCreateFolder(month, yearFolderId)

  const generalSpreadsheetId = await findOrCreateSpreadsheet(SPREADSHEET_NAME, rootFolderId)
  const recipientSpreadsheetId = await findOrCreateSpreadsheet(SPREADSHEET_NAME, recipientFolderId)
  const spreadsheetIds = [generalSpreadsheetId, recipientSpreadsheetId]

  for (const spreadsheetId of spreadsheetIds) {
    await ensureYearSheet(spreadsheetId, year)
  }

  return { folderId: monthFolderId, spreadsheetIds, year }
}

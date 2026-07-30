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
  spreadsheetId: string
  year: string
}

// Idempotent: re-running this for the same date/recipient never creates
// duplicate folders/spreadsheets — it always finds the existing ones first.
// Folder layout: Tickets/{recipient}/{year}/{month}/ — each recipient
// (Elliard, Hacienda, or a custom name) gets its own fully separate tree.
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

  let spreadsheetId = await findSpreadsheet(SPREADSHEET_NAME, rootFolderId)
  if (!spreadsheetId) {
    spreadsheetId = await createSpreadsheetFile(SPREADSHEET_NAME, rootFolderId)
  }
  await ensureYearSheet(spreadsheetId, year)

  return { folderId: monthFolderId, spreadsheetId, year }
}

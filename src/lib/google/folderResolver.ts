import { findOrCreateFolder, findSpreadsheet, createSpreadsheetFile } from './driveClient'
import { ensureYearSheet } from './sheetsClient'

const ROOT_FOLDER_NAME = 'Tickets'
const SPREADSHEET_NAME = 'Tickets - Registro'

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

// Idempotent: re-running this for the same date never creates duplicate
// folders/spreadsheets — it always finds the existing ones first.
export async function resolveDestination(ticketDate: Date): Promise<TicketDestination> {
  const year = String(ticketDate.getFullYear())
  const month = getMonthFolderName(ticketDate)

  const rootFolderId = await findOrCreateFolder(ROOT_FOLDER_NAME)
  const yearFolderId = await findOrCreateFolder(year, rootFolderId)
  const monthFolderId = await findOrCreateFolder(month, yearFolderId)

  let spreadsheetId = await findSpreadsheet(SPREADSHEET_NAME, rootFolderId)
  if (!spreadsheetId) {
    spreadsheetId = await createSpreadsheetFile(SPREADSHEET_NAME, rootFolderId)
  }
  await ensureYearSheet(spreadsheetId, year)

  return { folderId: monthFolderId, spreadsheetId, year }
}

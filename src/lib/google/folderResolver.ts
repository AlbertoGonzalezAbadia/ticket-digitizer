import { findOrCreateFolder, findSpreadsheet, createSpreadsheetFile } from './driveClient'
import { ensureYearSheet } from './sheetsClient'

const ROOT_FOLDER_NAME = 'Tickets'
const SPREADSHEET_NAME = 'Tickets - Registro'

export function getQuarter(date: Date): number {
  return Math.floor(date.getMonth() / 3) + 1
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
  const quarter = `T${getQuarter(ticketDate)}`

  const rootFolderId = await findOrCreateFolder(ROOT_FOLDER_NAME)
  const yearFolderId = await findOrCreateFolder(year, rootFolderId)
  const quarterFolderId = await findOrCreateFolder(quarter, yearFolderId)

  let spreadsheetId = await findSpreadsheet(SPREADSHEET_NAME, rootFolderId)
  if (!spreadsheetId) {
    spreadsheetId = await createSpreadsheetFile(SPREADSHEET_NAME, rootFolderId)
  }
  await ensureYearSheet(spreadsheetId, year)

  return { folderId: quarterFolderId, spreadsheetId, year }
}

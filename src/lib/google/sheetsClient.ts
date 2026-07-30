import { getAccessToken, invalidateTokenOnAuthError } from './auth'

const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets'

function authHeaders() {
  const token = getAccessToken()
  if (!token) throw new Error('No hay sesión de Google activa')
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
}

export const HEADER_ROW = [
  'Fecha',
  'Trimestre',
  'Proveedor/Comercio',
  'NIF/CIF',
  'Base Imponible',
  'Desglose IVA',
  'Importe IVA',
  'Total',
  'Categoría',
  'Enlace Imagen',
  'Nombre Archivo',
  'Notas',
  'Fecha de Alta',
  'Estado',
  'Destinatario',
]

interface SheetProperties {
  properties: { title: string }
}

async function getSheetTitles(spreadsheetId: string): Promise<string[]> {
  const res = await fetch(`${SHEETS_API}/${spreadsheetId}?fields=sheets.properties.title`, {
    headers: authHeaders(),
  })
  if (!res.ok) {
    invalidateTokenOnAuthError(res.status)
    throw new Error('Error al leer la hoja de cálculo')
  }
  const data = await res.json()
  const sheets: SheetProperties[] = data.sheets ?? []
  return sheets.map((s) => s.properties.title)
}

async function writeHeaderRow(spreadsheetId: string, year: string): Promise<void> {
  // HEADER_ROW is currently 15 columns (through 'O') — this single-letter
  // math would need revisiting (AA, AB, ...) if it ever grows past 26.
  const lastColumn = String.fromCharCode('A'.charCodeAt(0) + HEADER_ROW.length - 1)
  const res = await fetch(
    `${SHEETS_API}/${spreadsheetId}/values/${year}!A1:${lastColumn}1?valueInputOption=RAW`,
    {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ values: [HEADER_ROW] }),
    },
  )
  if (!res.ok) {
    invalidateTokenOnAuthError(res.status)
    throw new Error('Error al escribir la cabecera de la hoja')
  }
}

async function addYearSheet(spreadsheetId: string, year: string): Promise<void> {
  const res = await fetch(`${SHEETS_API}/${spreadsheetId}:batchUpdate`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ requests: [{ addSheet: { properties: { title: year } } }] }),
  })
  if (!res.ok) {
    invalidateTokenOnAuthError(res.status)
    throw new Error('Error al crear la pestaña del año')
  }
}

// Also re-writes the header row on every call (cheap, idempotent) so that
// existing year tabs pick up new columns added later — like Destinatario —
// instead of silently appending unlabeled data past the old header width.
export async function ensureYearSheet(spreadsheetId: string, year: string): Promise<void> {
  const titles = await getSheetTitles(spreadsheetId)
  if (!titles.includes(year)) {
    await addYearSheet(spreadsheetId, year)
  }
  await writeHeaderRow(spreadsheetId, year)
}

export async function appendTicketRow(
  spreadsheetId: string,
  year: string,
  row: (string | number)[],
): Promise<void> {
  const range = `${year}!A1`
  const res = await fetch(
    `${SHEETS_API}/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ values: [row] }),
    },
  )
  if (!res.ok) {
    invalidateTokenOnAuthError(res.status)
    throw new Error('Error al guardar la fila en la hoja de cálculo')
  }
}

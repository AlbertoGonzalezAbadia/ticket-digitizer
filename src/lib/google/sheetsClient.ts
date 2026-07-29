import { getAccessToken } from './auth'

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
  '% IVA',
  'Importe IVA',
  'Total',
  'Categoría',
  'Enlace Imagen',
  'Nombre Archivo',
  'Notas',
  'Fecha de Alta',
  'Estado',
]

interface SheetProperties {
  properties: { title: string }
}

async function getSheetTitles(spreadsheetId: string): Promise<string[]> {
  const res = await fetch(`${SHEETS_API}/${spreadsheetId}?fields=sheets.properties.title`, {
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error('Error al leer la hoja de cálculo')
  const data = await res.json()
  const sheets: SheetProperties[] = data.sheets ?? []
  return sheets.map((s) => s.properties.title)
}

async function addYearSheet(spreadsheetId: string, year: string): Promise<void> {
  const res = await fetch(`${SHEETS_API}/${spreadsheetId}:batchUpdate`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ requests: [{ addSheet: { properties: { title: year } } }] }),
  })
  if (!res.ok) throw new Error('Error al crear la pestaña del año')

  await fetch(`${SHEETS_API}/${spreadsheetId}/values/${year}!A1:N1?valueInputOption=RAW`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ values: [HEADER_ROW] }),
  })
}

export async function ensureYearSheet(spreadsheetId: string, year: string): Promise<void> {
  const titles = await getSheetTitles(spreadsheetId)
  if (!titles.includes(year)) {
    await addYearSheet(spreadsheetId, year)
  }
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
  if (!res.ok) throw new Error('Error al guardar la fila en la hoja de cálculo')
}

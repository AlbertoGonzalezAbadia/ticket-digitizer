import { getAccessToken } from './auth'

const DRIVE_API = 'https://www.googleapis.com/drive/v3'
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3'
const APP_PROPERTY_CLAUSE = "appProperties has { key='app' and value='ticket-digitizer' }"

function authHeaders() {
  const token = getAccessToken()
  if (!token) throw new Error('No hay sesión de Google activa')
  return { Authorization: `Bearer ${token}` }
}

function escapeQueryValue(value: string): string {
  return value.replace(/'/g, "\\'")
}

async function findByName(name: string, mimeType: string, parentId?: string): Promise<string | null> {
  const parentClause = parentId ? ` and '${parentId}' in parents` : ""
  const q = `name = '${escapeQueryValue(name)}' and mimeType = '${mimeType}' and trashed = false and ${APP_PROPERTY_CLAUSE}${parentClause}`
  const url = `${DRIVE_API}/files?q=${encodeURIComponent(q)}&fields=files(id,name)`
  const res = await fetch(url, { headers: authHeaders() })
  if (!res.ok) throw new Error('Error al buscar en Google Drive')
  const data = await res.json()
  return data.files?.[0]?.id ?? null
}

export async function findFolder(name: string, parentId?: string): Promise<string | null> {
  return findByName(name, 'application/vnd.google-apps.folder', parentId)
}

export async function createFolder(name: string, parentId?: string): Promise<string> {
  const res = await fetch(`${DRIVE_API}/files`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: parentId ? [parentId] : undefined,
      appProperties: { app: 'ticket-digitizer' },
    }),
  })
  if (!res.ok) throw new Error('Error al crear carpeta en Drive')
  const data = await res.json()
  return data.id
}

export async function findOrCreateFolder(name: string, parentId?: string): Promise<string> {
  const existing = await findFolder(name, parentId)
  if (existing) return existing
  return createFolder(name, parentId)
}

export async function findSpreadsheet(name: string, parentId?: string): Promise<string | null> {
  return findByName(name, 'application/vnd.google-apps.spreadsheet', parentId)
}

export async function createSpreadsheetFile(name: string, parentId: string): Promise<string> {
  const res = await fetch(`${DRIVE_API}/files`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      mimeType: 'application/vnd.google-apps.spreadsheet',
      parents: [parentId],
      appProperties: { app: 'ticket-digitizer' },
    }),
  })
  if (!res.ok) throw new Error('Error al crear la hoja de cálculo')
  const data = await res.json()
  return data.id
}

export async function uploadImage(
  fileName: string,
  blob: Blob,
  folderId: string,
): Promise<{ id: string; webViewLink: string }> {
  const metadata = { name: fileName, parents: [folderId], appProperties: { app: 'ticket-digitizer' } }
  const form = new FormData()
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
  form.append('file', blob)

  const res = await fetch(`${UPLOAD_API}/files?uploadType=multipart&fields=id,webViewLink`, {
    method: 'POST',
    headers: authHeaders(),
    body: form,
  })
  if (!res.ok) throw new Error('Error al subir la imagen a Drive')
  return res.json()
}

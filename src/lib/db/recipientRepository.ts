import { getDb, RECIPIENTS_STORE } from './indexedDb'

export async function addCustomRecipient(name: string): Promise<void> {
  const db = await getDb()
  const existing = await db.get(RECIPIENTS_STORE, name)
  if (existing) return
  await db.put(RECIPIENTS_STORE, { name, createdAt: new Date().toISOString() })
}

export async function getCustomRecipients(): Promise<string[]> {
  const db = await getDb()
  const all = await db.getAll(RECIPIENTS_STORE)
  return all.map((r) => r.name).sort((a, b) => a.localeCompare(b))
}

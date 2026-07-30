import type { ParsedField } from './types'

// Tickets arrive in Spanish, English, and French. Month names/abbreviations
// across these three happen to share the same position for a given month,
// so a single normalized-name → index map covers all of them with no
// cross-language ambiguity.
const MONTH_MAP: Record<string, number> = {
  enero: 0, ene: 0, january: 0, jan: 0, janvier: 0, janv: 0,
  febrero: 1, feb: 1, february: 1, fevrero: 1, fevrier: 1, fevr: 1,
  marzo: 2, mar: 2, march: 2, mars: 2,
  abril: 3, abr: 3, april: 3, apr: 3, avril: 3, avr: 3,
  mayo: 4, may: 4, mai: 4,
  junio: 5, jun: 5, june: 5, juin: 5,
  // "jui" is an SSP France/Brioche Doree POS abbreviation confirmed to mean
  // juillet (July), not juin — resolved against that receipt's payment slip.
  julio: 6, jul: 6, july: 6, juillet: 6, juil: 6, jui: 6,
  agosto: 7, ago: 7, august: 7, aug: 7, aout: 7,
  septiembre: 8, setiembre: 8, sep: 8, sept: 8, september: 8, septembre: 8,
  octubre: 9, oct: 9, october: 9, octobre: 9,
  noviembre: 10, nov: 10, november: 10, novembre: 10,
  diciembre: 11, dic: 11, december: 11, dec: 11, decembre: 11,
}

const NUMERIC_DATE = /\b(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4}|\d{2})\b/
// "15 de enero de 2026" — the Spanish "day de Month de year" phrasing.
const SPANISH_LONG_DATE = /\b(\d{1,2})\s+de\s+([a-zA-ZÀ-ÿ]+)\s+(?:de\s+)?(\d{4}|\d{2})\b/gi
// "15 January 2026" / "15 janvier 2026" / "15 Jan. 2026" — day first.
const DAY_MONTHNAME_YEAR = /\b(\d{1,2})\s+([a-zA-ZÀ-ÿ]{3,})\.?,?\s+(\d{4}|\d{2})\b/gi
// "January 15, 2026" / "Jan 15 2026" — month first (common in English).
const MONTHNAME_DAY_YEAR = /\b([a-zA-ZÀ-ÿ]{3,})\.?\s+(\d{1,2}),?\s+(\d{4}|\d{2})\b/gi
// "Jui29'26" — some French POS printouts glue month+day+year with no
// spaces and an apostrophe before a 2-digit year (seen on a real SSP
// France/Brioche Doree receipt, cross-checked against that same
// transaction's card-payment slip, which printed "29/07/26" in full).
const COMPACT_MONTHNAME_DAY_YEAR = /\b([a-zA-ZÀ-ÿ]{3,10})(\d{1,2})['’](\d{2,4})\b/gi

function normalizeWord(word: string): string {
  return word
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function toIso(day: number, month1to12: number, year: number): string | null {
  if (month1to12 < 1 || month1to12 > 12 || day < 1 || day > 31) return null
  const fullYear = year < 100 ? 2000 + year : year
  const iso = `${fullYear}-${String(month1to12).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  return Number.isNaN(new Date(iso).getTime()) ? null : iso
}

function tryNumericDate(text: string): string | null {
  const match = text.match(NUMERIC_DATE)
  if (!match) return null
  const a = parseInt(match[1], 10)
  const b = parseInt(match[2], 10)
  const year = parseInt(match[3], 10)

  // If exactly one side can't be a month (> 12), it must be the day —
  // resolves the DD/MM vs MM/DD ambiguity whenever the numbers allow it.
  let day: number
  let month: number
  if (a > 12 && b <= 12) {
    day = a
    month = b
  } else if (b > 12 && a <= 12) {
    day = b
    month = a
  } else {
    // Genuinely ambiguous — default to day-first (DD/MM), the dominant
    // format for Spanish and French tickets.
    day = a
    month = b
  }
  return toIso(day, month, year)
}

function tryMonthNamePatterns(text: string): string | null {
  for (const match of text.matchAll(SPANISH_LONG_DATE)) {
    const month = MONTH_MAP[normalizeWord(match[2])]
    if (month === undefined) continue
    const iso = toIso(parseInt(match[1], 10), month + 1, parseInt(match[3], 10))
    if (iso) return iso
  }
  for (const match of text.matchAll(DAY_MONTHNAME_YEAR)) {
    const month = MONTH_MAP[normalizeWord(match[2])]
    if (month === undefined) continue
    const iso = toIso(parseInt(match[1], 10), month + 1, parseInt(match[3], 10))
    if (iso) return iso
  }
  for (const match of text.matchAll(MONTHNAME_DAY_YEAR)) {
    const month = MONTH_MAP[normalizeWord(match[1])]
    if (month === undefined) continue
    const iso = toIso(parseInt(match[2], 10), month + 1, parseInt(match[3], 10))
    if (iso) return iso
  }
  for (const match of text.matchAll(COMPACT_MONTHNAME_DAY_YEAR)) {
    const month = MONTH_MAP[normalizeWord(match[1])]
    if (month === undefined) continue
    const iso = toIso(parseInt(match[2], 10), month + 1, parseInt(match[3], 10))
    if (iso) return iso
  }
  return null
}

// Returns an ISO (YYYY-MM-DD) string so it plugs directly into <input type="date">.
export function parseDate(text: string): ParsedField<string> {
  const numeric = tryNumericDate(text)
  if (numeric) return { value: numeric, confidence: 'high' }

  const named = tryMonthNamePatterns(text)
  if (named) return { value: named, confidence: 'high' }

  return { value: null, confidence: 'low' }
}

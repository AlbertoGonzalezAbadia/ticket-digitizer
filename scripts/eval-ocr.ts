import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { createWorker, PSM } from 'tesseract.js'
import { parseTicketText } from '../src/lib/ocrParser/index.ts'
import type { IvaLine } from '../src/types/ticket.ts'

const TICKETS_DIR = path.resolve(import.meta.dirname, '../test_tickets')
const EXPECTED_PATH = path.join(TICKETS_DIR, 'expected.json')

interface ExpectedTicket {
  date: string | null
  vendor: string | null
  total: number | null
  ivaLines: IvaLine[]
}

function ivaLinesMatch(a: IvaLine[], b: IvaLine[]): boolean {
  if (a.length !== b.length) return false
  const norm = (lines: IvaLine[]) => [...lines].sort((x, y) => (x.percent ?? 0) - (y.percent ?? 0))
  const na = norm(a)
  const nb = norm(b)
  return na.every((line, i) => line.percent === nb[i].percent && line.amount === nb[i].amount)
}

function normalizeVendor(v: string | null): string {
  return (v ?? '').toLowerCase().trim()
}

function vendorMatch(got: string | null, expected: string | null): boolean {
  const g = normalizeVendor(got)
  const e = normalizeVendor(expected)
  if (!g || !e) return g === e
  return g.includes(e) || e.includes(g)
}

async function main() {
  const expectedRaw = await readFile(EXPECTED_PATH, 'utf-8')
  const expected: Record<string, ExpectedTicket> = JSON.parse(expectedRaw)

  const files = (await readdir(TICKETS_DIR)).filter((f) => /\.(jpe?g|png)$/i.test(f))

  if (files.length === 0) {
    console.log('No image files found in test_tickets/.')
    return
  }

  const worker = await createWorker('spa+eng+fra', 1)
  await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_COLUMN })

  let totalFields = 0
  let passedFields = 0
  let skipped = 0

  for (const file of files) {
    const exp = expected[file]
    console.log(`\n=== ${file} ===`)
    if (!exp) {
      console.log('  (no expected.json entry -- skipping; add one to test this file)')
      skipped++
      continue
    }

    const buffer = await readFile(path.join(TICKETS_DIR, file))
    const { data } = await worker.recognize(buffer)
    const parsed = parseTicketText(data.text)

    const checks: [string, boolean][] = [
      ['date', parsed.date.value === exp.date],
      ['vendor', vendorMatch(parsed.vendor.value, exp.vendor)],
      ['total', parsed.total.value === exp.total],
      ['ivaLines', ivaLinesMatch(parsed.iva.value ?? [], exp.ivaLines)],
    ]

    for (const [field, pass] of checks) {
      totalFields++
      if (pass) passedFields++
      console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${field}`)
    }

    if (checks.some(([, pass]) => !pass)) {
      console.log('  --- expected ---')
      console.log('  ', JSON.stringify(exp))
      console.log('  --- got ---')
      console.log(
        '  ',
        JSON.stringify({
          date: parsed.date.value,
          vendor: parsed.vendor.value,
          total: parsed.total.value,
          ivaLines: parsed.iva.value,
        }),
      )
      console.log('  --- raw OCR text ---')
      console.log(
        data.text
          .split('\n')
          .map((l) => '  | ' + l)
          .join('\n'),
      )
    }
  }

  await worker.terminate()

  console.log(`\n${passedFields}/${totalFields} field checks passed (${totalFields ? Math.round((passedFields / totalFields) * 100) : 0}%)`)
  if (skipped > 0) {
    console.log(`${skipped} ticket(s) skipped -- no expected.json entry`)
  }
}

main()

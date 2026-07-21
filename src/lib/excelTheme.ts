/* ═══════════════════════════════════════════════════════════════════════
   COSMO-CI-Styling-Werkzeugkasten für Excel-Exporte (ExcelJS)

   Kapselt Farben, Schrift und die wiederkehrenden Bausteine (Kopfband,
   Abschnittsband, Tabellenkopf, Zebrastreifen, Summenzeile, Druckbild),
   damit `excelExport.ts` nur noch Inhalte beschreibt.
   ═══════════════════════════════════════════════════════════════════════ */

import type { Alignment, Borders, Fill, Font, Worksheet } from 'exceljs'

/* ---------- CI-Palette (identisch zur Web-Oberfläche) ---------- */
export const CI = {
  gold: 'B39C4D',
  goldDark: 'C7962E',
  gold20: 'F0E9D6',
  gold10: 'F7F3E8',
  anthracite: '1B212E',
  anthracite80: '2D3644',
  anthracite5: 'F2F3F5',
  white: 'FFFFFF',
  slate50: 'F8FAFC',
  slate200: 'E5E9F0',
  slate400: '94A3B8',
  slate600: '5B6577',
  green: '2F7D4F',
  orange: 'FF671E',
  red: 'AA4628',
} as const

/**
 * CI-Schrift ist Quicksand (Web-Font der Plattform). Da Quicksand auf den
 * wenigsten Rechnern als Systemschrift installiert ist, verwendet die Mappe
 * Trebuchet MS als systemsicheren Ersatz (macOS + Windows).
 */
export const FONT = 'Trebuchet MS'
export const CI_FONT = 'Quicksand'

/* ---------- Zahlenformate ---------- */
export const fmt = {
  eur: (cur: string) => `#,##0" ${curSymbol(cur)}"`,
  eur2: (cur: string) => `#,##0.00" ${curSymbol(cur)}"`,
  days: '#,##0.0" PT"',
  days2: '#,##0.00" PT"',
  hours: '#,##0.0" h"',
  int: '#,##0',
  percent: '0.0%',
  percentValue: '0" %"',
} as const

function curSymbol(cur: string): string {
  const map: Record<string, string> = { EUR: '€', CHF: 'CHF', USD: '$', GBP: '£' }
  return map[cur] || cur
}

/* ---------- Kleine Style-Helfer ---------- */
export const font = (
  size = 10,
  bold = false,
  color: string = CI.anthracite,
  italic = false,
  name: string = FONT,
): Partial<Font> => ({ name, size, bold, italic, color: { argb: `FF${color}` } })

export const fill = (color: string): Fill => ({
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: `FF${color}` },
})

export const align = (
  horizontal: Alignment['horizontal'] = 'left',
  indent = 0,
  wrapText = false,
): Partial<Alignment> => ({ horizontal, vertical: 'middle', indent, wrapText })

const thin = { style: 'thin' as const, color: { argb: `FF${CI.slate200}` } }
const goldMedium = { style: 'medium' as const, color: { argb: `FF${CI.gold}` } }
const goldDouble = { style: 'double' as const, color: { argb: `FF${CI.gold}` } }

export const cellBorder = (): Partial<Borders> => ({
  top: thin,
  left: thin,
  bottom: thin,
  right: thin,
})

/* ---------- Bausteine ---------- */

/** Anthrazit-Kopfband mit Goldlinie – auf jedem Blatt identisch. Gibt die erste freie Zeile zurück. */
export function sheetHeader(
  ws: Worksheet,
  kicker: string,
  title: string,
  subtitle: string,
  lastCol: number,
): number {
  ws.views = [{ state: 'frozen', ySplit: 5, showGridLines: false }]
  ws.getRow(1).height = 8
  ws.getRow(2).height = 26
  ws.getRow(3).height = 18
  ws.getRow(4).height = 6
  ws.getRow(5).height = 14

  for (let r = 1; r <= 4; r++) {
    for (let c = 1; c <= lastCol; c++) ws.getCell(r, c).fill = fill(CI.anthracite)
  }
  for (let c = 1; c <= lastCol; c++) ws.getCell(4, c).fill = fill(CI.gold)

  const k = ws.getCell(1, 1)
  k.value = `  ${kicker}`
  k.font = font(7.5, true, CI.gold)
  k.alignment = align('left')

  ws.mergeCells(2, 1, 2, lastCol)
  const t = ws.getCell(2, 1)
  t.value = title
  t.font = font(16, true, CI.white)
  t.alignment = align('left', 1)

  ws.mergeCells(3, 1, 3, lastCol)
  const s = ws.getCell(3, 1)
  s.value = subtitle
  s.font = font(9.5, false, CI.gold)
  s.alignment = align('left', 1)

  return 6
}

/** Goldenes Abschnittsband, optional mit erläuterndem Hinweis darunter. */
export function section(
  ws: Worksheet,
  row: number,
  text: string,
  lastCol: number,
  note?: string,
): number {
  for (let c = 1; c <= lastCol; c++) {
    const cell = ws.getCell(row, c)
    cell.fill = fill(CI.gold20)
    cell.border = { bottom: goldMedium }
  }
  ws.mergeCells(row, 1, row, lastCol)
  const c = ws.getCell(row, 1)
  c.value = text
  c.font = font(11, true, CI.anthracite)
  c.alignment = align('left', 1)
  ws.getRow(row).height = 22
  row++

  if (note) {
    ws.mergeCells(row, 1, row, lastCol)
    const n = ws.getCell(row, 1)
    n.value = note
    n.font = font(8.5, false, CI.slate600, true)
    n.alignment = align('left', 1)
    ws.getRow(row).height = 16
    row++
  }
  return row
}

/** Anthrazit-Tabellenkopf. Spaltenbreiten optional. */
export function tableHeader(
  ws: Worksheet,
  row: number,
  headers: string[],
  widths?: number[],
  aligns?: Alignment['horizontal'][],
): number {
  headers.forEach((h, i) => {
    const cell = ws.getCell(row, i + 1)
    cell.value = h
    cell.font = font(9.5, true, CI.white)
    cell.fill = fill(CI.anthracite)
    const ha = aligns?.[i] || 'left'
    cell.alignment = align(ha, ha === 'left' ? 1 : 0, true)
    cell.border = {
      bottom: goldMedium,
      left: { style: 'thin', color: { argb: `FF${CI.anthracite80}` } },
      right: { style: 'thin', color: { argb: `FF${CI.anthracite80}` } },
    }
  })
  ws.getRow(row).height = 30
  widths?.forEach((w, i) => {
    ws.getColumn(i + 1).width = w
  })
  return row + 1
}

/** Zebrastreifen + Zellraster über einen Datenbereich. */
export function zebraGrid(ws: Worksheet, r0: number, r1: number, c0: number, c1: number): void {
  for (let r = r0; r <= r1; r++) {
    const striped = (r - r0) % 2 === 1
    for (let c = c0; c <= c1; c++) {
      const cell = ws.getCell(r, c)
      if (striped && !cell.fill) cell.fill = fill(CI.slate50)
      cell.border = cellBorder()
    }
  }
}

/** Summenzeile: Goldband oben, doppelte Goldlinie unten. */
export function totalsRow(ws: Worksheet, row: number, c0: number, c1: number): void {
  for (let c = c0; c <= c1; c++) {
    const cell = ws.getCell(row, c)
    cell.fill = fill(CI.gold20)
    cell.font = font(10, true, CI.anthracite)
    cell.border = { top: goldMedium, bottom: goldDouble }
  }
  ws.getRow(row).height = 20
}

/** Echte Excel-Tabelle (Filter, strukturierte Verweise) über einen bereits gefüllten Bereich. */
export function addAutoFilter(ws: Worksheet, headerRow: number, lastRow: number, lastCol: number): void {
  ws.autoFilter = {
    from: { row: headerRow, column: 1 },
    to: { row: lastRow, column: lastCol },
  }
}

/** Einheitliches Druckbild inkl. Fußzeile. */
export function printSetup(
  ws: Worksheet,
  opts: { landscape?: boolean; titleRow?: number } = {},
): void {
  const { landscape = true, titleRow } = opts
  ws.pageSetup = {
    orientation: landscape ? 'landscape' : 'portrait',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 },
    printTitlesRow: titleRow ? `${titleRow}:${titleRow}` : undefined,
  }
  ws.headerFooter = {
    oddFooter:
      '&L&8&K808080COSMO CONSULT · Workshop- & Angebots-Kalkulation&C&8&K808080vertraulich&R&8&K808080Seite &P von &N',
  }
}

/** Spaltenbuchstabe zu 1-basiertem Index. */
export function col(index: number): string {
  let s = ''
  let n = index
  while (n > 0) {
    const rest = (n - 1) % 26
    s = String.fromCharCode(65 + rest) + s
    n = Math.floor((n - 1) / 26)
  }
  return s
}

/** Formelzelle mit Ergebnis-Cache (damit Werte auch ohne Neuberechnung sichtbar sind). */
export function formula(f: string, result?: number | string) {
  return { formula: f, result } as { formula: string; result?: number | string }
}

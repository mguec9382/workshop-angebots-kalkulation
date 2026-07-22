/* ═══════════════════════════════════════════════════════════════════════
   Angebots-Arbeitsmappe (XLSX) im COSMO-CI

   Erzeugt aus dem aktuellen Projekt-State eine formatierte, rechnende
   Excel-Datei mit elf Blättern:

     Deckblatt · 1 Angebot · 2 Aufwand & Scope · 3 Phasen · 4 Prozesse & Fit
     5 Lizenzen · 6 Overhead · 7 Environments · 8 Parameter · 9 MBPC-Katalog
     10 CI-Styleguide

   Die Mappe ist kein Wertabzug, sondern ein Rechenmodell: Aufwände,
   Tagessätze, Zuschläge, Lizenzpreise und Mengen sind Eingabefelder
   (gold hinterlegt); alle Kosten, Summen und Kennzahlen sind Excel-Formeln.
   Ändert man auf „8 · Parameter“ einen Tagessatz, läuft das bis zur
   Gesamtinvestition auf „1 · Angebot“ durch.

   ExcelJS statt SheetJS: die Community-Version von `xlsx` kann keine
   Zellformatierung schreiben.
   ═══════════════════════════════════════════════════════════════════════ */

import type { Workbook, Worksheet } from 'exceljs'
import { GROUP_LABEL, archetypeById, findIndustry, processById } from '../data/catalog'
import { calculate } from './calc'
import { catalogsForState } from './mbpcCatalog'
import {
  CI,
  CI_FONT,
  FONT,
  addAutoFilter,
  align,
  cellBorder,
  col,
  fill,
  fmt,
  font,
  formula,
  printSetup,
  section,
  sheetHeader,
  tableHeader,
  totalsRow,
  zebraGrid,
} from './excelTheme'
import type { CatalogProcess, Lang, PhaseKey, ProjectState } from '../types'
import { CALC_PHASE_KEYS } from '../types'

const SHEET = {
  cover: 'Deckblatt',
  quote: '1 · Angebot',
  scope: '2 · Aufwand & Scope',
  phases: '3 · Phasen',
  processes: '4 · Prozesse & Fit',
  licenses: '5 · Lizenzen',
  overhead: '6 · Overhead',
  environments: '7 · Environments',
  parameters: '8 · Parameter',
  catalog: '9 · MBPC-Katalog',
  styleguide: '10 · CI-Styleguide',
} as const

const PHASE_LABEL: Record<PhaseKey, string> = {
  strategize: 'Strategize',
  initiate: 'Initiate',
  build: 'Build',
  prepare: 'Prepare',
  operate: 'Operate',
}

const PHASE_DESC: Record<PhaseKey, string> = {
  strategize: 'Strategie, Zielbild, Scope-Absicherung',
  initiate: 'Analyse, Fit-Gap, Lösungsdesign',
  build: 'Konfiguration, Entwicklung, Migration',
  prepare: 'Test, Schulung, Cutover-Vorbereitung',
  operate: 'Go-Live-Begleitung, Hypercare',
}

/** Absoluter Zellbezug auf ein anderes Blatt, z. B. `'8 · Parameter'!$B$10`. */
const ref = (sheet: string, cell: string) => `'${sheet}'!${cell}`
const abs = (colIdx: number, row: number) => `$${col(colIdx)}$${row}`
const range = (sheet: string, colIdx: number, r0: number, r1: number) =>
  `'${sheet}'!$${col(colIdx)}$${r0}:$${col(colIdx)}$${r1}`

/* ═══════════════════════════════════════════════════════════════════════
   Öffentliche API
   ═══════════════════════════════════════════════════════════════════════ */

/** Baut die Arbeitsmappe (ohne Download) – auch für Tests/Node nutzbar. */
export async function buildQuoteWorkbook(state: ProjectState, lang: Lang = 'de'): Promise<Workbook> {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()

  const calc = calculate(state)
  const cur = state.parameters.currency
  const period = state.periodMonths
  const params = state.parameters
  const prospect = state.prospect
  const EUR = fmt.eur(cur)
  const EUR2 = fmt.eur2(cur)

  wb.creator = 'COSMO CONSULT'
  wb.company = 'COSMO CONSULT'
  wb.title = 'COSMO CONSULT · Workshop- & Angebotskalkulation'
  wb.subject = 'MBPC-Workshop · Success by Design · Angebotskalkulation'
  wb.keywords = 'MBPC, Success by Design, Angebot, Kalkulation, Business Central'
  wb.description = `Angebotskalkulation ${prospect.company || 'Interessent'} – erzeugt aus der Workshop- & Angebots-Kalkulations-Plattform.`
  wb.created = new Date()

  /* ---------- Namensauflösung (MBPC-Import + Standard-Katalog) ---------- */
  const procList: CatalogProcess[] = catalogsForState(state)
  const procMap = new Map(procList.map((p) => [p.id, p]))
  const procOf = (id: string) => procMap.get(id) || processById(id)
  const procName = (id: string) => {
    const p = procOf(id)
    if (!p) return id
    return (lang === 'de' ? p.nameDE : p.nameEN) || p.nameDE || id
  }
  const procGroup = (id: string) => {
    const p = procOf(id)
    return p ? GROUP_LABEL[p.group][lang] : ''
  }
  const areaName = (processId: string, areaIdx: number) => {
    const a = procOf(processId)?.areas?.[areaIdx]
    return a ? (lang === 'de' ? a.t : a.en) || a.t : ''
  }

  /* ---------- Flache Feature-Liste über alle Environments ---------- */
  type Row = {
    env: string
    processId: string
    areaIdx: number
    stepIdx: number
    label: string
    scope: string
    standard: boolean
    phaseDays: Record<PhaseKey, number>
  }
  const featureRows: Row[] = []
  for (const env of calc.perEnvironment) {
    for (const f of env.scope.features) {
      featureRows.push({
        env: env.name,
        processId: f.processId,
        areaIdx: f.areaIdx,
        stepIdx: f.stepIdx,
        label: f.label,
        scope: f.scope,
        standard: f.standard,
        phaseDays: f.phaseDays,
      })
    }
  }
  featureRows.sort(
    (a, b) =>
      a.env.localeCompare(b.env) ||
      procName(a.processId).localeCompare(procName(b.processId)) ||
      a.areaIdx - b.areaIdx ||
      a.stepIdx - b.stepIdx,
  )

  /* ═════════════════════════════════════════════════════════════════════
     8 · PARAMETER  (zuerst: liefert die Bezüge für alle Kostenformeln)
     ═════════════════════════════════════════════════════════════════════ */
  const wsP = wb.addWorksheet(SHEET.parameters, { properties: { tabColor: { argb: `FF${CI.anthracite}` } } })
  let r = sheetHeader(wsP, 'PARAMETER', 'Kalkulationsgrundlagen',
    'Währung, Rollen & Tagessätze, Rollenzuordnung je SbD-Phase, Zuschläge', 7)
  ;[34, 18, 16, 16, 18, 20, 26].forEach((w, i) => (wsP.getColumn(i + 1).width = w))

  r = section(wsP, r, 'Allgemeine Parameter', 7)
  const globals: [string, string | number, string | undefined][] = [
    ['Währung', cur, undefined],
    ['Stunden je Personentag', params.hoursPerDay, fmt.int],
    ['Einheit der Erfassung', params.unit === 'days' ? 'Tage (PT)' : 'Stunden', undefined],
    ['Betrachtungszeitraum (Monate)', period, fmt.int],
  ]
  const globalRow: Record<string, number> = {}
  for (const [label, value, numFmt] of globals) {
    const a = wsP.getCell(r, 1)
    a.value = label
    a.font = font(9.5, true)
    a.alignment = align('left', 1)
    a.fill = fill(CI.anthracite5)
    const b = wsP.getCell(r, 2)
    b.value = value
    b.font = font(9.5, true, CI.goldDark)
    b.alignment = align('center')
    b.fill = fill(CI.gold10)
    if (numFmt) b.numFmt = numFmt
    a.border = cellBorder()
    b.border = cellBorder()
    globalRow[label] = r
    r++
  }
  const R_HOURS = ref(SHEET.parameters, abs(2, globalRow['Stunden je Personentag']))
  const R_PERIOD = ref(SHEET.parameters, abs(2, globalRow['Betrachtungszeitraum (Monate)']))
  r++

  r = section(wsP, r, 'Rollen & Tagessätze', 7,
    'Dienstleistungssätze je Rolle – Basis aller Kostenformeln dieser Arbeitsmappe.')
  r = tableHeader(wsP, r,
    ['Rolle', 'Rollen-ID', `Tagessatz (${cur})`, `Stundensatz (${cur})`, 'Einsatz in Phase', 'Overhead-Rolle', 'Hinweis'],
    undefined,
    ['left', 'left', 'right', 'right', 'left', 'center', 'left'])
  const roleFirst = r
  const phasesOfRole: Record<string, string[]> = {}
  for (const p of CALC_PHASE_KEYS) {
    const id = params.phaseRole[p]
    ;(phasesOfRole[id] ||= []).push(PHASE_LABEL[p])
  }
  for (const role of params.roles) {
    const isOverhead = params.overhead.some((o) => o.name.includes(role.name))
    wsP.getCell(r, 1).value = role.name
    wsP.getCell(r, 1).font = font(9.5, true)
    wsP.getCell(r, 1).alignment = align('left', 1)
    wsP.getCell(r, 2).value = role.id
    wsP.getCell(r, 2).font = font(9, false, CI.slate600)
    const rate = wsP.getCell(r, 3)
    rate.value = role.rate
    rate.numFmt = EUR
    rate.font = font(9.5, true)
    rate.fill = fill(CI.gold10)
    rate.alignment = align('right')
    const hourly = wsP.getCell(r, 4)
    hourly.value = formula(`C${r}/${R_HOURS}`, role.rate / (params.hoursPerDay || 8))
    hourly.numFmt = EUR2
    hourly.font = font(9.5, false, CI.slate600)
    hourly.alignment = align('right')
    wsP.getCell(r, 5).value = phasesOfRole[role.id]?.join(', ') || '–'
    wsP.getCell(r, 5).font = font(9)
    wsP.getCell(r, 6).value = isOverhead ? 'ja' : '–'
    wsP.getCell(r, 6).alignment = align('center')
    wsP.getCell(r, 6).font = font(9, true, isOverhead ? CI.green : CI.slate400)
    wsP.getCell(r, 7).value = 'Eingabefeld – Änderung wirkt auf alle Blätter'
    wsP.getCell(r, 7).font = font(8.5, false, CI.slate400, true)
    r++
  }
  const roleLast = r - 1
  zebraGrid(wsP, roleFirst, roleLast, 1, 7)
  const ROLE_TABLE = `'${SHEET.parameters}'!$A$${roleFirst}:$C$${roleLast}`
  r++

  r = section(wsP, r, 'Rolle je Success-by-Design-Phase', 7,
    'Der hier hinterlegte Tagessatz bewertet den Aufwand der jeweiligen Phase (Blatt „2 · Aufwand & Scope“).')
  r = tableHeader(wsP, r,
    ['SbD-Phase', 'Rolle', 'Rollen-ID', `Tagessatz (${cur})`, 'Aufwand gesamt', 'Kosten gesamt', 'Inhalt der Phase'],
    undefined,
    ['left', 'left', 'left', 'right', 'right', 'right', 'left'])
  const phaseRoleFirst = r
  const phaseRateRef: Record<PhaseKey, string> = {} as Record<PhaseKey, string>
  const phaseRoleRow: Record<PhaseKey, number> = {} as Record<PhaseKey, number>
  for (const p of CALC_PHASE_KEYS) {
    const roleId = params.phaseRole[p]
    const role = params.roles.find((x) => x.id === roleId)
    wsP.getCell(r, 1).value = PHASE_LABEL[p]
    wsP.getCell(r, 1).font = font(9.5, true)
    wsP.getCell(r, 1).alignment = align('left', 1)
    const roleCell = wsP.getCell(r, 2)
    roleCell.value = role?.name || roleId
    roleCell.font = font(9.5)
    roleCell.fill = fill(CI.gold10)
    roleCell.dataValidation = {
      type: 'list',
      allowBlank: false,
      formulae: [`"${params.roles.map((x) => x.name).join(',')}"`],
    }
    wsP.getCell(r, 3).value = roleId
    wsP.getCell(r, 3).font = font(9, false, CI.slate600)
    const rate = wsP.getCell(r, 4)
    rate.value = formula(`VLOOKUP($B${r},${ROLE_TABLE},3,FALSE)`, role?.rate ?? 0)
    rate.numFmt = EUR
    rate.font = font(9.5, true, CI.goldDark)
    rate.alignment = align('right')
    wsP.getCell(r, 7).value = PHASE_DESC[p]
    wsP.getCell(r, 7).font = font(8.5, false, CI.slate600)
    phaseRateRef[p] = ref(SHEET.parameters, abs(4, r))
    phaseRoleRow[p] = r
    r++
  }
  const phaseRoleLast = r - 1
  zebraGrid(wsP, phaseRoleFirst, phaseRoleLast, 1, 7)
  r++

  r = section(wsP, r, 'Fachübergreifende Rollen (Overhead)', 7,
    'Prozentuale Zuschläge auf den Feature-Aufwand. Länderübergreifende Zuschläge greifen ab dem zweiten Land.')
  r = tableHeader(wsP, r,
    ['Overhead-Rolle', 'Modus', 'Wert', `Tagessatz (${cur})`, 'Nur länderübergreifend', 'Aktiv', 'Wirkung'],
    undefined,
    ['left', 'center', 'right', 'right', 'center', 'center', 'left'])
  const ohParamFirst = r
  for (const oh of params.overhead) {
    wsP.getCell(r, 1).value = oh.name
    wsP.getCell(r, 1).font = font(9.5, true)
    wsP.getCell(r, 1).alignment = align('left', 1)
    const mode = wsP.getCell(r, 2)
    mode.value = oh.mode === 'percent' ? 'Prozent' : 'Fixe PT'
    mode.alignment = align('center')
    mode.font = font(9.5)
    mode.dataValidation = { type: 'list', allowBlank: false, formulae: ['"Prozent,Fixe PT"'] }
    const val = wsP.getCell(r, 3)
    val.value = oh.value
    val.numFmt = oh.mode === 'percent' ? fmt.percentValue : fmt.days
    val.font = font(9.5, true)
    val.fill = fill(CI.gold10)
    val.alignment = align('right')
    const rate = wsP.getCell(r, 4)
    rate.value = oh.rate
    rate.numFmt = EUR
    rate.fill = fill(CI.gold10)
    rate.alignment = align('right')
    rate.font = font(9.5)
    for (const [c, v] of [[5, oh.crossCountryOnly], [6, oh.active]] as [number, boolean][]) {
      const cell = wsP.getCell(r, c)
      cell.value = v ? 'ja' : 'nein'
      cell.alignment = align('center')
      cell.font = font(9, c === 6, c === 6 ? (v ? CI.green : CI.slate400) : CI.anthracite)
      cell.dataValidation = { type: 'list', allowBlank: false, formulae: ['"ja,nein"'] }
    }
    wsP.getCell(r, 7).value = oh.mode === 'percent' ? 'Zuschlag auf den gesamten Feature-Aufwand' : 'Fixer Aufwand'
    wsP.getCell(r, 7).font = font(8.5, false, CI.slate600)
    r++
  }
  const ohParamLast = r - 1
  zebraGrid(wsP, ohParamFirst, ohParamLast, 1, 7)
  printSetup(wsP)

  /* ═════════════════════════════════════════════════════════════════════
     2 · AUFWAND & SCOPE
     ═════════════════════════════════════════════════════════════════════ */
  const wsA = wb.addWorksheet(SHEET.scope, { properties: { tabColor: { argb: `FF${CI.gold}` } } })
  r = sheetHeader(wsA, 'KALKULATION', 'Aufwand & Scope je Feature',
    'Aufwandsschätzung je In-Scope-Feature über die vier kalkulationsrelevanten Success-by-Design-Phasen', 14)
  r = section(wsA, r, 'In-Scope-Features', 14,
    'Aufwand in Personentagen (PT). Kosten = Σ (Phasenaufwand × Tagessatz der Phasenrolle) laut Blatt „8 · Parameter“.')
  const scopeHead = r
  r = tableHeader(wsA, r,
    ['Environment', 'Prozess', 'Prozessbereich', 'Feature / Prozessschritt', 'Scope', 'Typ',
      ...CALC_PHASE_KEYS.map((p) => PHASE_LABEL[p]), 'Aufwand PT', 'Stunden', `Kosten (${cur})`, 'Bemerkung'],
    [20, 22, 24, 34, 11, 13, 10, 10, 10, 10, 12, 15, 15, 26],
    ['left', 'left', 'left', 'left', 'center', 'center', 'right', 'right', 'right', 'right', 'right', 'right', 'right', 'left'])
  const scopeFirst = r
  for (const f of featureRows) {
    wsA.getCell(r, 1).value = f.env
    wsA.getCell(r, 1).font = font(9)
    wsA.getCell(r, 2).value = procName(f.processId)
    wsA.getCell(r, 2).font = font(9)
    wsA.getCell(r, 3).value = areaName(f.processId, f.areaIdx)
    wsA.getCell(r, 3).font = font(9, false, CI.slate600)
    const label = wsA.getCell(r, 4)
    label.value = f.label
    label.font = font(9.5, true)
    label.alignment = align('left', 1)
    const sc = wsA.getCell(r, 5)
    sc.value = f.scope === 'in' ? 'In' : f.scope === 'opt' ? 'Optional' : 'Out'
    sc.alignment = align('center')
    sc.font = font(9, true, f.scope === 'in' ? CI.green : f.scope === 'opt' ? CI.orange : CI.slate400)
    sc.dataValidation = { type: 'list', allowBlank: false, formulae: ['"In,Optional,Out"'] }
    const typ = wsA.getCell(r, 6)
    typ.value = f.standard ? 'Standard' : 'Customizing'
    typ.alignment = align('center')
    typ.font = font(9, false, f.standard ? CI.slate600 : CI.red)
    typ.dataValidation = { type: 'list', allowBlank: false, formulae: ['"Standard,Customizing"'] }
    CALC_PHASE_KEYS.forEach((p, i) => {
      const cell = wsA.getCell(r, 7 + i)
      cell.value = f.phaseDays[p] || null
      cell.numFmt = fmt.days2
      cell.alignment = align('right')
      cell.font = font(9.5)
      cell.fill = fill(CI.gold10)
    })
    const days = CALC_PHASE_KEYS.reduce((s, p) => s + (f.phaseDays[p] || 0), 0)
    const cost = CALC_PHASE_KEYS.reduce(
      (s, p) => s + (f.phaseDays[p] || 0) * (params.roles.find((x) => x.id === params.phaseRole[p])?.rate ?? 0), 0)
    const total = wsA.getCell(r, 11)
    total.value = formula(`SUM(G${r}:J${r})`, days)
    total.numFmt = fmt.days
    total.font = font(9.5, true)
    total.alignment = align('right')
    const hours = wsA.getCell(r, 12)
    hours.value = formula(`K${r}*${R_HOURS}`, days * (params.hoursPerDay || 8))
    hours.numFmt = fmt.hours
    hours.font = font(9, false, CI.slate600)
    hours.alignment = align('right')
    const costCell = wsA.getCell(r, 13)
    costCell.value = formula(
      CALC_PHASE_KEYS.map((p, i) => `${col(7 + i)}${r}*${phaseRateRef[p]}`).join('+'), cost)
    costCell.numFmt = EUR
    costCell.font = font(9.5, true)
    costCell.alignment = align('right')
    if (!f.standard) {
      wsA.getCell(r, 14).value = 'Customizing – Aufwand mit Entwicklung abstimmen'
      wsA.getCell(r, 14).font = font(8.5, false, CI.red, true)
    }
    r++
  }
  const scopeLast = r - 1
  zebraGrid(wsA, scopeFirst, scopeLast, 1, 14)
  addAutoFilter(wsA, scopeHead, scopeLast, 14)

  const scopeTotalRow = r
  wsA.getCell(r, 1).value = 'Summe In-Scope-Features'
  wsA.getCell(r, 1).alignment = align('left', 1)
  wsA.getCell(r, 4).value = `${featureRows.length} Features`
  wsA.getCell(r, 4).alignment = align('left', 1)
  CALC_PHASE_KEYS.forEach((p, i) => {
    const c = wsA.getCell(r, 7 + i)
    c.value = formula(`SUM(${col(7 + i)}${scopeFirst}:${col(7 + i)}${scopeLast})`, calc.phaseDays[p])
    c.numFmt = fmt.days
    c.alignment = align('right')
  })
  wsA.getCell(r, 11).value = formula(`SUM(K${scopeFirst}:K${scopeLast})`, calc.featureDays)
  wsA.getCell(r, 11).numFmt = fmt.days
  wsA.getCell(r, 11).alignment = align('right')
  wsA.getCell(r, 12).value = formula(`SUM(L${scopeFirst}:L${scopeLast})`, calc.featureDays * (params.hoursPerDay || 8))
  wsA.getCell(r, 12).numFmt = fmt.hours
  wsA.getCell(r, 12).alignment = align('right')
  wsA.getCell(r, 13).value = formula(`SUM(M${scopeFirst}:M${scopeLast})`, calc.featureCost)
  wsA.getCell(r, 13).numFmt = EUR
  wsA.getCell(r, 13).alignment = align('right')
  totalsRow(wsA, r, 1, 14)

  wsA.addConditionalFormatting({
    ref: `K${scopeFirst}:K${scopeLast}`,
    rules: [{
      type: 'dataBar', priority: 1, gradient: true, showValue: true,
      cfvo: [{ type: 'num', value: 0 }, { type: 'max' }],
      color: { argb: `FF${CI.gold}` },
    } as never],
  })
  printSetup(wsA, { titleRow: scopeHead })

  const R_FEATURE_DAYS = ref(SHEET.scope, abs(11, scopeTotalRow))
  const R_FEATURE_COST = ref(SHEET.scope, abs(13, scopeTotalRow))
  const RG_ENV = range(SHEET.scope, 1, scopeFirst, scopeLast)
  const RG_PROC = range(SHEET.scope, 2, scopeFirst, scopeLast)
  const RG_TYPE = range(SHEET.scope, 6, scopeFirst, scopeLast)
  const RG_DAYS = range(SHEET.scope, 11, scopeFirst, scopeLast)
  const RG_COST = range(SHEET.scope, 13, scopeFirst, scopeLast)

  /* ═════════════════════════════════════════════════════════════════════
     3 · PHASEN
     ═════════════════════════════════════════════════════════════════════ */
  const wsPh = wb.addWorksheet(SHEET.phases, { properties: { tabColor: { argb: `FF${CI.gold}` } } })
  r = sheetHeader(wsPh, 'VERDICHTUNG', 'Aufwand je Success-by-Design-Phase',
    'Phasenaufwand, Phasenrolle und Kosten – abgeleitet aus Blatt „2 · Aufwand & Scope“', 8)
  r = section(wsPh, r, 'Phasenübersicht', 8)
  const phHead = r
  r = tableHeader(wsPh, r,
    ['SbD-Phase', 'Inhalt', 'Rolle', `Tagessatz (${cur})`, 'Aufwand PT', 'Anteil Aufwand', `Kosten (${cur})`, 'Anteil Kosten'],
    [18, 42, 22, 16, 14, 15, 18, 15],
    ['left', 'left', 'left', 'right', 'right', 'right', 'right', 'right'])
  const phFirst = r
  CALC_PHASE_KEYS.forEach((p) => {
    const rate = params.roles.find((x) => x.id === params.phaseRole[p])?.rate ?? 0
    wsPh.getCell(r, 1).value = PHASE_LABEL[p]
    wsPh.getCell(r, 1).font = font(10, true)
    wsPh.getCell(r, 1).alignment = align('left', 1)
    wsPh.getCell(r, 2).value = PHASE_DESC[p]
    wsPh.getCell(r, 2).font = font(9, false, CI.slate600)
    wsPh.getCell(r, 3).value = formula(`${ref(SHEET.parameters, `B${phaseRoleRow[p]}`)}`,
      params.roles.find((x) => x.id === params.phaseRole[p])?.name || '')
    wsPh.getCell(r, 3).font = font(9.5)
    const rateCell = wsPh.getCell(r, 4)
    rateCell.value = formula(phaseRateRef[p], rate)
    rateCell.numFmt = EUR
    rateCell.alignment = align('right')
    rateCell.font = font(9.5)
    const daysCell = wsPh.getCell(r, 5)
    daysCell.value = formula(`SUM(${range(SHEET.scope, 7 + CALC_PHASE_KEYS.indexOf(p), scopeFirst, scopeLast)})`, calc.phaseDays[p])
    daysCell.numFmt = fmt.days
    daysCell.font = font(10, true)
    daysCell.alignment = align('right')
    const shareDays = wsPh.getCell(r, 6)
    shareDays.value = formula(`IFERROR(E${r}/SUM($E$${phFirst}:$E$${phFirst + CALC_PHASE_KEYS.length - 1}),0)`,
      calc.featureDays ? calc.phaseDays[p] / calc.featureDays : 0)
    shareDays.numFmt = fmt.percent
    shareDays.alignment = align('right')
    shareDays.font = font(9.5, false, CI.slate600)
    const costCell = wsPh.getCell(r, 7)
    costCell.value = formula(`E${r}*D${r}`, calc.phaseCost[p])
    costCell.numFmt = EUR
    costCell.font = font(10, true)
    costCell.alignment = align('right')
    const shareCost = wsPh.getCell(r, 8)
    shareCost.value = formula(`IFERROR(G${r}/SUM($G$${phFirst}:$G$${phFirst + CALC_PHASE_KEYS.length - 1}),0)`,
      calc.featureCost ? calc.phaseCost[p] / calc.featureCost : 0)
    shareCost.numFmt = fmt.percent
    shareCost.alignment = align('right')
    shareCost.font = font(9.5, false, CI.slate600)
    wsPh.getRow(r).height = 18
    r++
  })
  const phLast = r - 1
  zebraGrid(wsPh, phFirst, phLast, 1, 8)
  addAutoFilter(wsPh, phHead, phLast, 8)
  wsPh.getCell(r, 1).value = 'Summe Features'
  wsPh.getCell(r, 1).alignment = align('left', 1)
  wsPh.getCell(r, 5).value = formula(`SUM(E${phFirst}:E${phLast})`, calc.featureDays)
  wsPh.getCell(r, 5).numFmt = fmt.days
  wsPh.getCell(r, 5).alignment = align('right')
  wsPh.getCell(r, 6).value = 1
  wsPh.getCell(r, 6).numFmt = fmt.percent
  wsPh.getCell(r, 6).alignment = align('right')
  wsPh.getCell(r, 7).value = formula(`SUM(G${phFirst}:G${phLast})`, calc.featureCost)
  wsPh.getCell(r, 7).numFmt = EUR
  wsPh.getCell(r, 7).alignment = align('right')
  wsPh.getCell(r, 8).value = 1
  wsPh.getCell(r, 8).numFmt = fmt.percent
  wsPh.getCell(r, 8).alignment = align('right')
  totalsRow(wsPh, r, 1, 8)
  wsPh.addConditionalFormatting({
    ref: `E${phFirst}:E${phLast}`,
    rules: [{
      type: 'dataBar', priority: 1, gradient: true, showValue: true,
      cfvo: [{ type: 'num', value: 0 }, { type: 'max' }],
      color: { argb: `FF${CI.gold}` },
    } as never],
  })
  printSetup(wsPh)

  /* ═════════════════════════════════════════════════════════════════════
     5 · LIZENZEN
     ═════════════════════════════════════════════════════════════════════ */
  const wsL = wb.addWorksheet(SHEET.licenses, { properties: { tabColor: { argb: `FF${CI.gold}` } } })
  r = sheetHeader(wsL, 'LIZENZEN', 'Lizenzaufstellung je Environment',
    `Subskriptionen – monatlich, jährlich und über den Betrachtungszeitraum von ${period} Monaten`, 8)
  r = section(wsL, r, 'Lizenzzeilen', 8,
    'Preise als Listenpreis je Einheit und Monat. Rabatte bitte im Einzelpreis abbilden.')
  const licHead = r
  r = tableHeader(wsL, r,
    ['Environment', 'Produkt', 'Anbieter', `Preis/Monat (${cur})`, 'Menge', `Summe/Monat (${cur})`,
      `Summe/Jahr (${cur})`, `Summe ${period} Mon. (${cur})`],
    [26, 40, 16, 18, 12, 20, 20, 24],
    ['left', 'left', 'center', 'right', 'right', 'right', 'right', 'right'])
  const licFirst = r
  const vendorOf = (product: string): string => {
    const p = product.toLowerCase()
    if (p.startsWith('cosmo')) return 'COSMO'
    if (p.includes('continia') || p.includes('webcon')) return 'Drittanbieter'
    return 'Microsoft'
  }
  for (const env of state.environments) {
    for (const lic of env.licenses) {
      wsL.getCell(r, 1).value = env.name
      wsL.getCell(r, 1).font = font(9, false, CI.slate600)
      wsL.getCell(r, 2).value = lic.product
      wsL.getCell(r, 2).font = font(9.5, true)
      wsL.getCell(r, 2).alignment = align('left', 1)
      const vendor = vendorOf(lic.product)
      const vc = wsL.getCell(r, 3)
      vc.value = vendor
      vc.alignment = align('center')
      vc.font = font(9, true, vendor === 'COSMO' ? CI.goldDark : vendor === 'Microsoft' ? CI.anthracite : CI.slate600)
      const price = wsL.getCell(r, 4)
      price.value = lic.unitPriceMonthly
      price.numFmt = EUR2
      price.alignment = align('right')
      price.fill = fill(CI.gold10)
      price.font = font(9.5)
      const qty = wsL.getCell(r, 5)
      qty.value = lic.quantity
      qty.numFmt = fmt.int
      qty.alignment = align('right')
      qty.fill = fill(CI.gold10)
      qty.font = font(9.5)
      const monthly = wsL.getCell(r, 6)
      monthly.value = formula(`D${r}*E${r}`, lic.unitPriceMonthly * lic.quantity)
      monthly.numFmt = EUR
      monthly.alignment = align('right')
      monthly.font = font(9.5, true)
      const yearly = wsL.getCell(r, 7)
      yearly.value = formula(`F${r}*12`, lic.unitPriceMonthly * lic.quantity * 12)
      yearly.numFmt = EUR
      yearly.alignment = align('right')
      yearly.font = font(9.5)
      const periodCell = wsL.getCell(r, 8)
      periodCell.value = formula(`F${r}*${R_PERIOD}`, lic.unitPriceMonthly * lic.quantity * period)
      periodCell.numFmt = EUR
      periodCell.alignment = align('right')
      periodCell.font = font(9.5, true)
      r++
    }
  }
  const licLast = Math.max(licFirst, r - 1)
  if (r === licFirst) {
    wsL.getCell(r, 2).value = 'Keine Lizenzzeilen erfasst'
    wsL.getCell(r, 2).font = font(9, false, CI.slate400, true)
    r++
  }
  zebraGrid(wsL, licFirst, licLast, 1, 8)
  addAutoFilter(wsL, licHead, licLast, 8)
  const licTotalRow = r
  wsL.getCell(r, 1).value = 'Gesamt Lizenzen'
  wsL.getCell(r, 1).alignment = align('left', 1)
  wsL.getCell(r, 5).value = formula(`SUM(E${licFirst}:E${licLast})`)
  wsL.getCell(r, 5).numFmt = fmt.int
  wsL.getCell(r, 5).alignment = align('right')
  wsL.getCell(r, 6).value = formula(`SUM(F${licFirst}:F${licLast})`, calc.licenseMonthly)
  wsL.getCell(r, 6).numFmt = EUR
  wsL.getCell(r, 6).alignment = align('right')
  wsL.getCell(r, 7).value = formula(`SUM(G${licFirst}:G${licLast})`, calc.licenseYearly)
  wsL.getCell(r, 7).numFmt = EUR
  wsL.getCell(r, 7).alignment = align('right')
  wsL.getCell(r, 8).value = formula(`SUM(H${licFirst}:H${licLast})`, calc.licensePeriod)
  wsL.getCell(r, 8).numFmt = EUR
  wsL.getCell(r, 8).alignment = align('right')
  totalsRow(wsL, r, 1, 8)
  printSetup(wsL)

  /* ═════════════════════════════════════════════════════════════════════
     6 · OVERHEAD
     ═════════════════════════════════════════════════════════════════════ */
  const wsO = wb.addWorksheet(SHEET.overhead, { properties: { tabColor: { argb: `FF${CI.gold}` } } })
  r = sheetHeader(wsO, 'PROJEKT-OVERHEAD', 'Fachübergreifende Rollen',
    'Zuschläge auf den Feature-Aufwand – Steuerung, Architektur und Programm-Management', 8)
  r = section(wsO, r, 'Overhead-Positionen', 8,
    'Berechnungsbasis: Feature-Aufwand gesamt (Blatt „2 · Aufwand & Scope“). Die Anzahl Länder wird aus Blatt „7 · Environments“ ermittelt.')
  const ohHead = r
  r = tableHeader(wsO, r,
    ['Position', 'Modus', 'Wert', `Tagessatz (${cur})`, 'Nur länderübergreifend', 'Angewendet', 'Aufwand PT', `Kosten (${cur})`],
    [38, 14, 12, 16, 20, 15, 14, 20],
    ['left', 'center', 'right', 'right', 'center', 'center', 'right', 'right'])
  const ohFirst = r
  const envFirstRow = 8 // Datenbeginn auf Blatt 7 (Kopfband 1–5, Abschnitt 6, Tabellenkopf 7)
  const envLastRow = envFirstRow + Math.max(state.environments.length, 1) - 1
  const COUNTRY_RANGE = range(SHEET.environments, 3, envFirstRow, envLastRow)
  const COUNTRIES = `SUMPRODUCT((${COUNTRY_RANGE}<>"")/COUNTIF(${COUNTRY_RANGE},${COUNTRY_RANGE}&""))`
  params.overhead.forEach((oh, i) => {
    const pRow = ohParamFirst + i
    const line = calc.overheadLines[i]
    wsO.getCell(r, 1).value = formula(ref(SHEET.parameters, `A${pRow}`), oh.name)
    wsO.getCell(r, 1).font = font(9.5, true)
    wsO.getCell(r, 1).alignment = align('left', 1)
    const mode = wsO.getCell(r, 2)
    mode.value = formula(ref(SHEET.parameters, `B${pRow}`), oh.mode === 'percent' ? 'Prozent' : 'Fixe PT')
    mode.alignment = align('center')
    mode.font = font(9.5)
    const val = wsO.getCell(r, 3)
    val.value = formula(ref(SHEET.parameters, `C${pRow}`), oh.value)
    val.numFmt = oh.mode === 'percent' ? fmt.percentValue : fmt.days
    val.alignment = align('right')
    val.font = font(9.5)
    const rate = wsO.getCell(r, 4)
    rate.value = formula(ref(SHEET.parameters, `D${pRow}`), oh.rate)
    rate.numFmt = EUR
    rate.alignment = align('right')
    rate.font = font(9.5)
    const cross = wsO.getCell(r, 5)
    cross.value = formula(ref(SHEET.parameters, `E${pRow}`), oh.crossCountryOnly ? 'ja' : 'nein')
    cross.alignment = align('center')
    cross.font = font(9)
    const applied = wsO.getCell(r, 6)
    applied.value = formula(
      `IF(AND(${ref(SHEET.parameters, `F${pRow}`)}="ja",OR(E${r}="nein",${COUNTRIES}>1)),"ja","nein")`,
      line?.applied ? 'ja' : 'nein')
    applied.alignment = align('center')
    applied.font = font(9.5, true, line?.applied ? CI.green : CI.slate400)
    const days = wsO.getCell(r, 7)
    days.value = formula(
      `IF(F${r}="nein",0,IF($B${r}="Prozent",$C${r}/100*${R_FEATURE_DAYS},$C${r}))`, line?.days ?? 0)
    days.numFmt = fmt.days2
    days.alignment = align('right')
    days.font = font(9.5, true)
    const cost = wsO.getCell(r, 8)
    cost.value = formula(`G${r}*D${r}`, line?.cost ?? 0)
    cost.numFmt = EUR
    cost.alignment = align('right')
    cost.font = font(9.5, true)
    wsO.getRow(r).height = 18
    r++
  })
  const ohLast = r - 1
  zebraGrid(wsO, ohFirst, ohLast, 1, 8)
  addAutoFilter(wsO, ohHead, ohLast, 8)
  const ohTotalRow = r
  wsO.getCell(r, 1).value = 'Summe Projekt-Overhead'
  wsO.getCell(r, 1).alignment = align('left', 1)
  wsO.getCell(r, 7).value = formula(`SUM(G${ohFirst}:G${ohLast})`, calc.overheadDays)
  wsO.getCell(r, 7).numFmt = fmt.days
  wsO.getCell(r, 7).alignment = align('right')
  wsO.getCell(r, 8).value = formula(`SUM(H${ohFirst}:H${ohLast})`, calc.overheadCost)
  wsO.getCell(r, 8).numFmt = EUR
  wsO.getCell(r, 8).alignment = align('right')
  totalsRow(wsO, r, 1, 8)
  r += 2
  r = section(wsO, r, 'Berechnungsbasis', 8)
  const basis: [string, string, number | undefined, string | undefined][] = [
    ['Feature-Aufwand gesamt', R_FEATURE_DAYS, calc.featureDays, fmt.days],
    ['Feature-Kosten gesamt', R_FEATURE_COST, calc.featureCost, EUR],
    ['Anzahl Länder im Projekt', COUNTRIES, calc.distinctCountries, fmt.int],
    ['Länderübergreifendes Projekt', `IF(${COUNTRIES}>1,"ja","nein")`, undefined, undefined],
  ]
  for (const [label, f, result, numFmt] of basis) {
    const a = wsO.getCell(r, 1)
    a.value = label
    a.font = font(9.5, true)
    a.alignment = align('left', 1)
    a.fill = fill(CI.anthracite5)
    a.border = cellBorder()
    const b = wsO.getCell(r, 2)
    b.value = formula(f, result ?? (calc.distinctCountries > 1 ? 'ja' : 'nein'))
    b.font = font(9.5, true, CI.goldDark)
    b.alignment = align('center')
    if (numFmt) b.numFmt = numFmt
    b.border = cellBorder()
    r++
  }
  printSetup(wsO)

  /* ═════════════════════════════════════════════════════════════════════
     4 · PROZESSE & FIT
     ═════════════════════════════════════════════════════════════════════ */
  const wsPr = wb.addWorksheet(SHEET.processes, { properties: { tabColor: { argb: `FF${CI.gold}` } } })
  r = sheetHeader(wsPr, 'ANALYSE', 'Prozesse, Fit-Score & Aufwand',
    'Verdichtete Entscheidungssicht je MBPC-End-to-End-Prozess', 9)
  r = section(wsPr, r, 'Prozessübersicht', 9,
    'Fit-Score 1–5 aus dem MBPC-Workshop (Mittel über die Environments). Aufwand und Kosten werden über SUMMEWENN aus Blatt „2 · Aufwand & Scope“ gezogen.')
  const prHead = r
  r = tableHeader(wsPr, r,
    ['Prozess (MBPC)', 'Prozessgruppe', 'Kat.-Nr.', 'Fit-Score', 'Features in Scope', 'davon Customizing',
      'Aufwand PT', `Kosten (${cur})`, 'Bewertung'],
    [32, 24, 11, 12, 17, 18, 14, 18, 30],
    ['left', 'left', 'center', 'center', 'right', 'right', 'right', 'right', 'left'])
  const prFirst = r
  const fitValues: Record<string, number[]> = {}
  for (const env of state.environments) {
    for (const [pid, v] of Object.entries(env.scope.fit || {})) (fitValues[pid] ||= []).push(v)
  }
  const daysByProc = new Map<string, number>()
  for (const f of featureRows) {
    const d = CALC_PHASE_KEYS.reduce((s, p) => s + (f.phaseDays[p] || 0), 0)
    daysByProc.set(f.processId, (daysByProc.get(f.processId) || 0) + d)
  }
  const usedProcs = [...daysByProc.keys()].sort((a, b) => (daysByProc.get(b) || 0) - (daysByProc.get(a) || 0))
  for (const pid of usedProcs) {
    const scores = fitValues[pid] || []
    const fit = scores.length ? Math.round((scores.reduce((s, v) => s + v, 0) / scores.length) * 10) / 10 : 0
    wsPr.getCell(r, 1).value = procName(pid)
    wsPr.getCell(r, 1).font = font(9.5, true)
    wsPr.getCell(r, 1).alignment = align('left', 1)
    wsPr.getCell(r, 2).value = procGroup(pid)
    wsPr.getCell(r, 2).font = font(9, false, CI.slate600)
    wsPr.getCell(r, 3).value = procOf(pid)?.catId ?? ''
    wsPr.getCell(r, 3).alignment = align('center')
    wsPr.getCell(r, 3).font = font(9, false, CI.slate400)
    const fitCell = wsPr.getCell(r, 4)
    fitCell.value = fit
    fitCell.numFmt = '0.0'
    fitCell.alignment = align('center')
    fitCell.font = font(10, true)
    const count = wsPr.getCell(r, 5)
    count.value = formula(`COUNTIF(${RG_PROC},$A${r})`)
    count.alignment = align('right')
    count.font = font(9.5)
    const custom = wsPr.getCell(r, 6)
    custom.value = formula(`COUNTIFS(${RG_PROC},$A${r},${RG_TYPE},"Customizing")`)
    custom.alignment = align('right')
    custom.font = font(9.5, false, CI.red)
    const days = wsPr.getCell(r, 7)
    days.value = formula(`SUMIF(${RG_PROC},$A${r},${RG_DAYS})`, daysByProc.get(pid) || 0)
    days.numFmt = fmt.days
    days.font = font(9.5, true)
    days.alignment = align('right')
    const cost = wsPr.getCell(r, 8)
    cost.value = formula(`SUMIF(${RG_PROC},$A${r},${RG_COST})`)
    cost.numFmt = EUR
    cost.font = font(9.5, true)
    cost.alignment = align('right')
    const verdict = wsPr.getCell(r, 9)
    verdict.value = formula(
      `IF($D${r}>=4.5,"Sehr guter Standard-Fit",IF($D${r}>=3.5,"Guter Fit – geringe Anpassung",IF($D${r}>=2.5,"Teil-Fit – Lösungsdesign nötig","Gap – Customizing erforderlich")))`)
    verdict.font = font(9, false, CI.slate600)
    r++
  }
  const prLast = Math.max(prFirst, r - 1)
  zebraGrid(wsPr, prFirst, prLast, 1, 9)
  addAutoFilter(wsPr, prHead, prLast, 9)
  wsPr.getCell(r, 1).value = 'Gesamt'
  wsPr.getCell(r, 1).alignment = align('left', 1)
  for (const [c, numFmt, result] of [[5, fmt.int, undefined], [6, fmt.int, undefined],
    [7, fmt.days, calc.featureDays], [8, EUR, calc.featureCost]] as [number, string, number | undefined][]) {
    const cell = wsPr.getCell(r, c)
    cell.value = formula(`SUM(${col(c)}${prFirst}:${col(c)}${prLast})`, result)
    cell.numFmt = numFmt
    cell.alignment = align('right')
  }
  totalsRow(wsPr, r, 1, 9)
  wsPr.addConditionalFormatting({
    ref: `D${prFirst}:D${prLast}`,
    rules: [{
      type: 'colorScale', priority: 1,
      cfvo: [{ type: 'num', value: 1 }, { type: 'num', value: 3 }, { type: 'num', value: 5 }],
      color: [{ argb: 'FFF8D7C8' }, { argb: 'FFFFF1CC' }, { argb: 'FFCDE5D6' }],
    } as never],
  })
  printSetup(wsPr)

  /* ═════════════════════════════════════════════════════════════════════
     7 · ENVIRONMENTS
     ═════════════════════════════════════════════════════════════════════ */
  const wsE = wb.addWorksheet(SHEET.environments, { properties: { tabColor: { argb: `FF${CI.gold}` } } })
  r = sheetHeader(wsE, 'STRUKTUR', 'Environments & Mandanten',
    'Environments je Land/Mandant – mehr als ein Land aktiviert den Programm-Manager-Overhead', 10)
  r = section(wsE, r, 'Environments', 10)
  const envHead = r
  r = tableHeader(wsE, r,
    ['Environment', 'Typ', 'Land', 'Anwender', 'Mandanten', 'Aufwand PT', `Dienstleistung (${cur})`,
      `Lizenz/Monat (${cur})`, `Lizenz ${period} Mon. (${cur})`, `Gesamt Zeitraum (${cur})`],
    [26, 14, 10, 12, 34, 14, 20, 18, 22, 22],
    ['left', 'center', 'center', 'right', 'left', 'right', 'right', 'right', 'right', 'right'])
  // Der Datenbeginn muss mit `envFirstRow` (Overhead-Länderformel) übereinstimmen.
  const envStart = r
  for (const env of state.environments) {
    const ec = calc.perEnvironment.find((x) => x.id === env.id)
    wsE.getCell(r, 1).value = env.name
    wsE.getCell(r, 1).font = font(9.5, true)
    wsE.getCell(r, 1).alignment = align('left', 1)
    wsE.getCell(r, 2).value = env.type === 'prod' ? 'Produktiv' : env.type === 'test' ? 'Test' : 'Entwicklung'
    wsE.getCell(r, 2).alignment = align('center')
    wsE.getCell(r, 2).font = font(9)
    wsE.getCell(r, 3).value = env.country
    wsE.getCell(r, 3).alignment = align('center')
    wsE.getCell(r, 3).font = font(9.5, true, CI.goldDark)
    wsE.getCell(r, 4).value = env.users
    wsE.getCell(r, 4).numFmt = fmt.int
    wsE.getCell(r, 4).alignment = align('right')
    wsE.getCell(r, 4).font = font(9.5)
    wsE.getCell(r, 5).value = env.mandanten.map((m) => `${m.name} (${m.users})`).join(' · ')
    wsE.getCell(r, 5).font = font(8.5, false, CI.slate600)
    const days = wsE.getCell(r, 6)
    days.value = formula(`SUMIF(${RG_ENV},$A${r},${RG_DAYS})`, ec?.serviceDays)
    days.numFmt = fmt.days
    days.alignment = align('right')
    days.font = font(9.5, true)
    const service = wsE.getCell(r, 7)
    service.value = formula(`SUMIF(${RG_ENV},$A${r},${RG_COST})`, ec?.serviceCostOneTime)
    service.numFmt = EUR
    service.alignment = align('right')
    service.font = font(9.5, true)
    const licMonth = wsE.getCell(r, 8)
    licMonth.value = formula(
      `SUMIF(${range(SHEET.licenses, 1, licFirst, licLast)},$A${r},${range(SHEET.licenses, 6, licFirst, licLast)})`,
      ec?.licenseMonthly)
    licMonth.numFmt = EUR
    licMonth.alignment = align('right')
    licMonth.font = font(9.5)
    const licPeriod = wsE.getCell(r, 9)
    licPeriod.value = formula(`H${r}*${R_PERIOD}`, ec?.licensePeriod)
    licPeriod.numFmt = EUR
    licPeriod.alignment = align('right')
    licPeriod.font = font(9.5)
    const total = wsE.getCell(r, 10)
    total.value = formula(`G${r}+I${r}`, ec?.totalPeriod)
    total.numFmt = EUR
    total.alignment = align('right')
    total.font = font(9.5, true)
    wsE.getRow(r).height = 18
    r++
  }
  const envLast = Math.max(envStart, r - 1)
  zebraGrid(wsE, envStart, envLast, 1, 10)
  addAutoFilter(wsE, envHead, envLast, 10)
  wsE.getCell(r, 1).value = 'Gesamt (ohne Projekt-Overhead)'
  wsE.getCell(r, 1).alignment = align('left', 1)
  for (const [c, numFmt] of [[4, fmt.int], [6, fmt.days], [7, EUR], [8, EUR], [9, EUR], [10, EUR]] as [number, string][]) {
    const cell = wsE.getCell(r, c)
    cell.value = formula(`SUM(${col(c)}${envStart}:${col(c)}${envLast})`)
    cell.numFmt = numFmt
    cell.alignment = align('right')
  }
  totalsRow(wsE, r, 1, 10)
  r += 2
  r = section(wsE, r, 'Mandanten je Environment', 10)
  r = tableHeader(wsE, r, ['Environment', 'Mandant', 'Land', 'Anwender', 'Währung'], undefined,
    ['left', 'left', 'center', 'right', 'center'])
  const mandFirst = r
  for (const env of state.environments) {
    for (const m of env.mandanten) {
      wsE.getCell(r, 1).value = env.name
      wsE.getCell(r, 1).font = font(9, false, CI.slate600)
      wsE.getCell(r, 2).value = m.name
      wsE.getCell(r, 2).font = font(9.5, true)
      wsE.getCell(r, 2).alignment = align('left', 1)
      wsE.getCell(r, 3).value = m.country
      wsE.getCell(r, 3).alignment = align('center')
      wsE.getCell(r, 3).font = font(9)
      wsE.getCell(r, 4).value = m.users
      wsE.getCell(r, 4).numFmt = fmt.int
      wsE.getCell(r, 4).alignment = align('right')
      wsE.getCell(r, 4).font = font(9.5)
      wsE.getCell(r, 5).value = m.currency
      wsE.getCell(r, 5).alignment = align('center')
      wsE.getCell(r, 5).font = font(9, false, CI.slate600)
      r++
    }
  }
  if (r > mandFirst) zebraGrid(wsE, mandFirst, r - 1, 1, 5)
  printSetup(wsE)

  /* ═════════════════════════════════════════════════════════════════════
     1 · ANGEBOT
     ═════════════════════════════════════════════════════════════════════ */
  const wsQ = wb.addWorksheet(SHEET.quote, { properties: { tabColor: { argb: `FF${CI.anthracite}` } } })
  r = sheetHeader(wsQ, 'ANGEBOT', 'Angebotskalkulation',
    `${prospect.company || 'Interessent'} · Betrachtungszeitraum ${period} Monate · alle Beträge netto in ${cur}`, 7)
  ;[44, 16, 18, 18, 22, 16, 26].forEach((w, i) => (wsQ.getColumn(i + 1).width = w))

  r = section(wsQ, r, 'A · Dienstleistung – Aufwand je Success-by-Design-Phase', 7)
  r = tableHeader(wsQ, r,
    ['Position', 'Rolle', `Tagessatz (${cur})`, 'Aufwand PT', `Betrag (${cur})`, 'Anteil', 'Leistungsinhalt'],
    undefined,
    ['left', 'left', 'right', 'right', 'right', 'right', 'left'])
  const qPhaseFirst = r
  const qPhaseLast = qPhaseFirst + CALC_PHASE_KEYS.length - 1
  const qFeatureSubtotal = qPhaseLast + 1
  CALC_PHASE_KEYS.forEach((p, i) => {
    const row = qPhaseFirst + i
    const p3 = phFirst + i
    wsQ.getCell(row, 1).value = `Phase ${i + 1} · ${PHASE_LABEL[p]}`
    wsQ.getCell(row, 1).font = font(10, true)
    wsQ.getCell(row, 1).alignment = align('left', 1)
    wsQ.getCell(row, 2).value = formula(ref(SHEET.parameters, `B${phaseRoleRow[p]}`),
      params.roles.find((x) => x.id === params.phaseRole[p])?.name || '')
    wsQ.getCell(row, 2).font = font(9.5)
    const rate = wsQ.getCell(row, 3)
    rate.value = formula(phaseRateRef[p], params.roles.find((x) => x.id === params.phaseRole[p])?.rate ?? 0)
    rate.numFmt = EUR
    rate.alignment = align('right')
    rate.font = font(9.5)
    const days = wsQ.getCell(row, 4)
    days.value = formula(ref(SHEET.phases, `E${p3}`), calc.phaseDays[p])
    days.numFmt = fmt.days
    days.font = font(10, true)
    days.alignment = align('right')
    const amount = wsQ.getCell(row, 5)
    amount.value = formula(ref(SHEET.phases, `G${p3}`), calc.phaseCost[p])
    amount.numFmt = EUR
    amount.font = font(10, true)
    amount.alignment = align('right')
    const share = wsQ.getCell(row, 6)
    share.value = formula(`IFERROR(E${row}/$E$${qFeatureSubtotal},0)`,
      calc.featureCost ? calc.phaseCost[p] / calc.featureCost : 0)
    share.numFmt = fmt.percent
    share.alignment = align('right')
    share.font = font(9, false, CI.slate600)
    wsQ.getCell(row, 7).value = PHASE_DESC[p]
    wsQ.getCell(row, 7).font = font(8.5, false, CI.slate600)
    wsQ.getRow(row).height = 18
  })
  zebraGrid(wsQ, qPhaseFirst, qPhaseLast, 1, 7)
  wsQ.getCell(qFeatureSubtotal, 1).value = 'Zwischensumme Feature-Aufwand'
  wsQ.getCell(qFeatureSubtotal, 1).alignment = align('left', 1)
  wsQ.getCell(qFeatureSubtotal, 4).value = formula(`SUM(D${qPhaseFirst}:D${qPhaseLast})`, calc.featureDays)
  wsQ.getCell(qFeatureSubtotal, 4).numFmt = fmt.days
  wsQ.getCell(qFeatureSubtotal, 4).alignment = align('right')
  wsQ.getCell(qFeatureSubtotal, 5).value = formula(`SUM(E${qPhaseFirst}:E${qPhaseLast})`, calc.featureCost)
  wsQ.getCell(qFeatureSubtotal, 5).numFmt = EUR
  wsQ.getCell(qFeatureSubtotal, 5).alignment = align('right')
  totalsRow(wsQ, qFeatureSubtotal, 1, 7)
  r = qFeatureSubtotal + 2

  r = section(wsQ, r, 'B · Projekt-Overhead (fachübergreifende Rollen)', 7)
  r = tableHeader(wsQ, r,
    ['Position', 'Basis', 'Zuschlag', 'Aufwand PT', `Betrag (${cur})`, 'Angewendet', 'Hinweis'],
    undefined,
    ['left', 'left', 'right', 'right', 'right', 'center', 'left'])
  const qOhFirst = r
  params.overhead.forEach((oh, i) => {
    const o6 = ohFirst + i
    const line = calc.overheadLines[i]
    wsQ.getCell(r, 1).value = oh.name
    wsQ.getCell(r, 1).font = font(9.5, true)
    wsQ.getCell(r, 1).alignment = align('left', 1)
    wsQ.getCell(r, 2).value = oh.mode === 'percent' ? 'Feature-Aufwand' : 'fix'
    wsQ.getCell(r, 2).font = font(9, false, CI.slate600)
    const surcharge = wsQ.getCell(r, 3)
    surcharge.value = formula(ref(SHEET.overhead, `C${o6}`), oh.value)
    surcharge.numFmt = oh.mode === 'percent' ? fmt.percentValue : fmt.days
    surcharge.alignment = align('right')
    surcharge.font = font(9.5)
    const days = wsQ.getCell(r, 4)
    days.value = formula(ref(SHEET.overhead, `G${o6}`), line?.days ?? 0)
    days.numFmt = fmt.days2
    days.alignment = align('right')
    days.font = font(9.5, true)
    const amount = wsQ.getCell(r, 5)
    amount.value = formula(ref(SHEET.overhead, `H${o6}`), line?.cost ?? 0)
    amount.numFmt = EUR
    amount.alignment = align('right')
    amount.font = font(9.5, true)
    const applied = wsQ.getCell(r, 6)
    applied.value = formula(ref(SHEET.overhead, `F${o6}`), line?.applied ? 'ja' : 'nein')
    applied.alignment = align('center')
    applied.font = font(9, true, line?.applied ? CI.green : CI.slate400)
    wsQ.getCell(r, 7).value = oh.crossCountryOnly ? 'greift ab dem zweiten Land' : 'Projektsteuerung / Architektur'
    wsQ.getCell(r, 7).font = font(8.5, false, CI.slate600)
    r++
  })
  const qOhLast = Math.max(qOhFirst, r - 1)
  zebraGrid(wsQ, qOhFirst, qOhLast, 1, 7)
  const qOhSubtotal = r
  wsQ.getCell(r, 1).value = 'Zwischensumme Projekt-Overhead'
  wsQ.getCell(r, 1).alignment = align('left', 1)
  wsQ.getCell(r, 4).value = formula(`SUM(D${qOhFirst}:D${qOhLast})`, calc.overheadDays)
  wsQ.getCell(r, 4).numFmt = fmt.days
  wsQ.getCell(r, 4).alignment = align('right')
  wsQ.getCell(r, 5).value = formula(`SUM(E${qOhFirst}:E${qOhLast})`, calc.overheadCost)
  wsQ.getCell(r, 5).numFmt = EUR
  wsQ.getCell(r, 5).alignment = align('right')
  totalsRow(wsQ, r, 1, 7)
  r += 2

  r = section(wsQ, r, 'C · Lizenzen (Subskription)', 7)
  r = tableHeader(wsQ, r,
    ['Position', 'Environment', 'Menge', `je Monat (${cur})`, `Zeitraum (${cur})`, 'Monate', 'Hinweis'],
    undefined,
    ['left', 'left', 'right', 'right', 'right', 'center', 'left'])
  const qLicFirst = r
  for (const env of state.environments) {
    const ec = calc.perEnvironment.find((x) => x.id === env.id)
    wsQ.getCell(r, 1).value = `Lizenzen ${env.name}`
    wsQ.getCell(r, 1).font = font(9.5, true)
    wsQ.getCell(r, 1).alignment = align('left', 1)
    wsQ.getCell(r, 2).value = env.name
    wsQ.getCell(r, 2).font = font(9, false, CI.slate600)
    const qty = wsQ.getCell(r, 3)
    qty.value = formula(
      `SUMIF(${range(SHEET.licenses, 1, licFirst, licLast)},$B${r},${range(SHEET.licenses, 5, licFirst, licLast)})`,
      env.licenses.reduce((s, l) => s + l.quantity, 0))
    qty.numFmt = fmt.int
    qty.alignment = align('right')
    qty.font = font(9.5)
    const monthly = wsQ.getCell(r, 4)
    monthly.value = formula(
      `SUMIF(${range(SHEET.licenses, 1, licFirst, licLast)},$B${r},${range(SHEET.licenses, 6, licFirst, licLast)})`,
      ec?.licenseMonthly)
    monthly.numFmt = EUR
    monthly.alignment = align('right')
    monthly.font = font(9.5, true)
    const periodCell = wsQ.getCell(r, 5)
    periodCell.value = formula(`D${r}*${R_PERIOD}`, ec?.licensePeriod)
    periodCell.numFmt = EUR
    periodCell.alignment = align('right')
    periodCell.font = font(9.5, true)
    const months = wsQ.getCell(r, 6)
    months.value = formula(R_PERIOD, period)
    months.numFmt = fmt.int
    months.alignment = align('center')
    months.font = font(9)
    wsQ.getCell(r, 7).value = 'Listenpreis, monatliche Abrechnung'
    wsQ.getCell(r, 7).font = font(8.5, false, CI.slate600)
    r++
  }
  const qLicLast = Math.max(qLicFirst, r - 1)
  zebraGrid(wsQ, qLicFirst, qLicLast, 1, 7)
  const qLicSubtotal = r
  wsQ.getCell(r, 1).value = 'Zwischensumme Lizenzen'
  wsQ.getCell(r, 1).alignment = align('left', 1)
  wsQ.getCell(r, 4).value = formula(`SUM(D${qLicFirst}:D${qLicLast})`, calc.licenseMonthly)
  wsQ.getCell(r, 4).numFmt = EUR
  wsQ.getCell(r, 4).alignment = align('right')
  wsQ.getCell(r, 5).value = formula(`SUM(E${qLicFirst}:E${qLicLast})`, calc.licensePeriod)
  wsQ.getCell(r, 5).numFmt = EUR
  wsQ.getCell(r, 5).alignment = align('right')
  totalsRow(wsQ, r, 1, 7)
  r += 2

  r = section(wsQ, r, 'D · Angebotssumme', 7)
  const sumFirst = r
  const summary: [string, string | null, string | null, number | undefined, number | undefined][] = [
    ['Dienstleistung – Features', `E${qFeatureSubtotal}`, `D${qFeatureSubtotal}`, calc.featureCost, calc.featureDays],
    ['Dienstleistung – Projekt-Overhead', `E${qOhSubtotal}`, `D${qOhSubtotal}`, calc.overheadCost, calc.overheadDays],
    ['Dienstleistung gesamt (einmalig)', null, null, calc.serviceCostOneTime, calc.serviceDays],
    [`Lizenzen · ${period} Monate`, `E${qLicSubtotal}`, null, calc.licensePeriod, undefined],
    ['Lizenzen je Monat (Run-Rate)', `D${qLicSubtotal}`, null, calc.licenseMonthly, undefined],
  ]
  summary.forEach(([label, valueRef, daysRef, amount, days], i) => {
    const row = sumFirst + i
    const a = wsQ.getCell(row, 1)
    a.value = label
    a.font = font(10, true)
    a.alignment = align('left', 1)
    a.fill = fill(CI.anthracite5)
    const isServiceTotal = i === 2
    if (isServiceTotal) {
      const d = wsQ.getCell(row, 4)
      d.value = formula(`D${row - 2}+D${row - 1}`, days)
      d.numFmt = fmt.days
      d.alignment = align('right')
      d.font = font(10, true)
      const v = wsQ.getCell(row, 5)
      v.value = formula(`E${row - 2}+E${row - 1}`, amount)
      v.numFmt = EUR
      v.alignment = align('right')
      v.font = font(11, true, CI.goldDark)
      for (let c = 1; c <= 7; c++) wsQ.getCell(row, c).fill = fill(CI.gold10)
    } else {
      if (daysRef) {
        const d = wsQ.getCell(row, 4)
        d.value = formula(daysRef, days)
        d.numFmt = fmt.days
        d.alignment = align('right')
        d.font = font(9.5)
      }
      const v = wsQ.getCell(row, 5)
      v.value = formula(valueRef as string, amount)
      v.numFmt = EUR
      v.alignment = align('right')
      v.font = font(10, true)
    }
    for (let c = 1; c <= 7; c++) wsQ.getCell(row, c).border = cellBorder()
    wsQ.getRow(row).height = 19
  })
  const serviceTotalRow = sumFirst + 2
  const licPeriodRow = sumFirst + 3
  const grandTotalRow = sumFirst + summary.length + 1

  wsQ.mergeCells(grandTotalRow, 1, grandTotalRow, 3)
  const gt = wsQ.getCell(grandTotalRow, 1)
  gt.value = `GESAMTINVESTITION · ${period} MONATE`
  gt.font = font(13, true, CI.white)
  gt.alignment = align('left', 1)
  const gtDays = wsQ.getCell(grandTotalRow, 4)
  gtDays.value = formula(`D${serviceTotalRow}`, calc.serviceDays)
  gtDays.numFmt = fmt.days
  gtDays.font = font(12, true, CI.slate400)
  gtDays.alignment = align('right')
  const gtValue = wsQ.getCell(grandTotalRow, 5)
  gtValue.value = formula(`E${serviceTotalRow}+E${licPeriodRow}`, calc.totalPeriod)
  gtValue.numFmt = EUR
  gtValue.font = font(16, true, CI.gold)
  gtValue.alignment = align('right')
  wsQ.getCell(grandTotalRow, 6).value = 'netto'
  wsQ.getCell(grandTotalRow, 6).font = font(9, false, CI.slate400)
  wsQ.getCell(grandTotalRow, 6).alignment = align('center')
  wsQ.getCell(grandTotalRow, 7).value = 'zzgl. gesetzlicher USt.'
  wsQ.getCell(grandTotalRow, 7).font = font(8.5, false, CI.slate400)
  for (let c = 1; c <= 7; c++) {
    const cell = wsQ.getCell(grandTotalRow, c)
    cell.fill = fill(CI.anthracite)
    cell.border = {
      top: { style: 'medium', color: { argb: `FF${CI.gold}` } },
      bottom: { style: 'medium', color: { argb: `FF${CI.gold}` } },
    }
  }
  wsQ.getRow(grandTotalRow).height = 34

  r = grandTotalRow + 2
  r = section(wsQ, r, 'Hinweise zum Angebot', 7)
  const notes = [
    'Alle Beträge verstehen sich netto zzgl. der jeweils gültigen gesetzlichen Umsatzsteuer.',
    'Die Aufwände basieren auf dem im MBPC-Workshop abgestimmten Scope (Blatt „2 · Aufwand & Scope“).',
    'Änderungen am Scope oder an den Tagessätzen wirken sich unmittelbar auf alle Summen dieser Mappe aus.',
    `Lizenzkosten sind Subskriptionen und über ${period} Monate hochgerechnet; Preisanpassungen des Herstellers bleiben vorbehalten.`,
    'Reise- und Nebenkosten sind nicht enthalten und werden nach Aufwand abgerechnet.',
    'Angebotsbindefrist: 30 Tage ab Ausstellungsdatum.',
  ]
  for (const n of notes) {
    wsQ.mergeCells(r, 1, r, 7)
    const cell = wsQ.getCell(r, 1)
    cell.value = `·  ${n}`
    cell.font = font(9, false, CI.slate600)
    cell.alignment = align('left', 1)
    wsQ.getRow(r).height = 16
    r++
  }
  printSetup(wsQ, { landscape: false })

  /* ═════════════════════════════════════════════════════════════════════
     9 · MBPC-KATALOG
     ═════════════════════════════════════════════════════════════════════ */
  const wsK = wb.addWorksheet(SHEET.catalog, { properties: { tabColor: { argb: `FF${CI.anthracite80}` } } })
  r = sheetHeader(wsK, 'REFERENZ', 'Microsoft Business Process Catalog',
    'End-to-End-Prozesse, Prozessbereiche und Prozessschritte als Workshop-Grundlage', 7)
  r = section(wsK, r, 'Prozesskatalog', 7,
    'Referenzliste aller Prozessschritte. Die im Scope bewerteten Schritte sind gold hervorgehoben.')
  const catHead = r
  r = tableHeader(wsK, r,
    ['Prozess', 'Kat.-Nr.', 'Gruppe', 'Prozessbereich', 'Nr.', 'Prozessschritt', 'Business-Central-Bezug'],
    [30, 10, 22, 34, 8, 46, 44],
    ['left', 'center', 'left', 'left', 'center', 'left', 'left'])
  const catFirst = r
  const inScopeKeys = new Set(featureRows.map((f) => `${f.processId}::${f.areaIdx}::${f.stepIdx}`))
  for (const p of procList) {
    p.areas.forEach((area, ai) => {
      const steps = lang === 'de' ? area.steps : area.stepsEN?.length ? area.stepsEN : area.steps
      steps.forEach((step, si) => {
        wsK.getCell(r, 1).value = lang === 'de' ? p.nameDE : p.nameEN
        wsK.getCell(r, 1).font = font(9, false, CI.slate600)
        wsK.getCell(r, 2).value = p.catId ?? ''
        wsK.getCell(r, 2).alignment = align('center')
        wsK.getCell(r, 2).font = font(9, false, CI.slate400)
        wsK.getCell(r, 3).value = GROUP_LABEL[p.group][lang]
        wsK.getCell(r, 3).font = font(9, false, CI.slate400)
        wsK.getCell(r, 4).value = lang === 'de' ? area.t : area.en || area.t
        wsK.getCell(r, 4).font = font(9)
        wsK.getCell(r, 5).value = `${ai + 1}.${si + 1}`
        wsK.getCell(r, 5).alignment = align('center')
        wsK.getCell(r, 5).font = font(8.5, false, CI.slate400)
        const inScope = inScopeKeys.has(`${p.id}::${ai}::${si}`)
        const cell = wsK.getCell(r, 6)
        cell.value = step
        cell.font = font(9.5, inScope, inScope ? CI.goldDark : CI.anthracite)
        cell.alignment = align('left', 1)
        wsK.getCell(r, 7).value = (area.bc || []).join(' · ')
        wsK.getCell(r, 7).font = font(8.5, false, CI.slate600)
        r++
      })
    })
  }
  const catLast = Math.max(catFirst, r - 1)
  zebraGrid(wsK, catFirst, catLast, 1, 7)
  addAutoFilter(wsK, catHead, catLast, 7)
  wsK.views = [{ state: 'frozen', ySplit: catHead, showGridLines: false, zoomScale: 90 }]
  printSetup(wsK, { titleRow: catHead })

  /* ═════════════════════════════════════════════════════════════════════
     10 · CI-STYLEGUIDE
     ═════════════════════════════════════════════════════════════════════ */
  const wsS = wb.addWorksheet(SHEET.styleguide, { properties: { tabColor: { argb: `FF${CI.gold}` } } })
  r = sheetHeader(wsS, 'STYLEGUIDE', 'COSMO CONSULT · Corporate Design',
    'Farben, Typografie und Formatregeln dieser Arbeitsmappe', 7)
  ;[30, 16, 18, 22, 30, 24, 24].forEach((w, i) => (wsS.getColumn(i + 1).width = w))
  r = section(wsS, r, 'Farbpalette', 7)
  r = tableHeader(wsS, r, ['Farbe', 'HEX', 'RGB', 'Rolle im Design', 'Muster', 'Einsatz', 'Kontrast'], undefined,
    ['left', 'center', 'center', 'left', 'center', 'left', 'center'])
  const palFirst = r
  const palette: [string, string, string, string, string][] = [
    ['COSMO Gold', CI.gold, 'Primäre Akzentfarbe', 'Kopfbänder, Summen, Kennzahlen', 'AA (auf Anthrazit)'],
    ['Gold dunkel', CI.goldDark, 'Akzent für Zahlenwerte', 'Beträge, Hervorhebungen', 'AA'],
    ['Gold 20 %', CI.gold20, 'Abschnittsbänder', 'Sektionsüberschriften, Summenzeilen', '–'],
    ['Gold 10 %', CI.gold10, 'Eingabefelder', 'alle manuell pflegbaren Zellen', '–'],
    ['Anthrazit', CI.anthracite, 'Primäre Dunkelfarbe', 'Kopfzeilen, Tabellenköpfe, Gesamtsumme', 'AAA (auf Weiß)'],
    ['Anthrazit 80 %', CI.anthracite80, 'Trennlinien dunkel', 'Rahmen in Kopfzeilen', '–'],
    ['Slate 600', CI.slate600, 'Sekundärtext', 'Beschreibungen, Hinweise', 'AA'],
    ['Slate 400', CI.slate400, 'Tertiärtext', 'Labels, Metadaten', '–'],
    ['Slate 200', CI.slate200, 'Rasterlinien', 'Zellrahmen', '–'],
    ['Slate 50', CI.slate50, 'Zebrastreifen', 'jede zweite Datenzeile', '–'],
    ['Erfolg Grün', CI.green, 'Statusfarbe positiv', 'Scope „In“, aktive Zuschläge', 'AA'],
    ['Signal Orange', CI.orange, 'Statusfarbe neutral', 'Scope „Optional“', 'AA'],
    ['Alarm Rot', CI.red, 'Statusfarbe kritisch', 'Customizing, Gaps', 'AA'],
  ]
  for (const [name, hex, role, usage, contrast] of palette) {
    wsS.getCell(r, 1).value = name
    wsS.getCell(r, 1).font = font(9.5, true)
    wsS.getCell(r, 1).alignment = align('left', 1)
    wsS.getCell(r, 2).value = `#${hex}`
    wsS.getCell(r, 2).alignment = align('center')
    wsS.getCell(r, 2).font = font(9, false, CI.anthracite, false, 'Consolas')
    const rgb = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(', ')
    wsS.getCell(r, 3).value = rgb
    wsS.getCell(r, 3).alignment = align('center')
    wsS.getCell(r, 3).font = font(9, false, CI.slate600, false, 'Consolas')
    wsS.getCell(r, 4).value = role
    wsS.getCell(r, 4).font = font(9)
    wsS.getCell(r, 5).fill = fill(hex)
    wsS.getCell(r, 6).value = usage
    wsS.getCell(r, 6).font = font(9, false, CI.slate600)
    wsS.getCell(r, 7).value = contrast
    wsS.getCell(r, 7).alignment = align('center')
    wsS.getCell(r, 7).font = font(9, false, CI.slate400)
    wsS.getRow(r).height = 20
    r++
  }
  zebraGrid(wsS, palFirst, r - 1, 1, 4)
  for (let row = palFirst; row < r; row++) {
    for (let c = 5; c <= 7; c++) wsS.getCell(row, c).border = cellBorder()
  }
  r++
  r = section(wsS, r, 'Typografie & Zahlenformate', 7)
  r = tableHeader(wsS, r, ['Element', 'Schrift', 'Größe', 'Farbe', 'Beispiel', 'Zahlenformat', 'Regel'], undefined,
    ['left', 'left', 'center', 'left', 'left', 'left', 'left'])
  const typoFirst = r
  const typo: [string, string, number, string, string, string, string][] = [
    ['Blatttitel', `${FONT} Bold`, 16, 'Weiß auf Anthrazit', 'Angebotskalkulation', '–', 'einmal je Blatt, Zeile 2'],
    ['Untertitel', FONT, 9.5, 'Gold', 'MBPC-Workshop · Success by Design', '–', 'Zeile 3'],
    ['Abschnitt', `${FONT} Bold`, 11, 'Anthrazit auf Gold 20 %', 'A · Dienstleistung', '–', 'Goldlinie unten'],
    ['Tabellenkopf', `${FONT} Bold`, 9.5, 'Weiß auf Anthrazit', 'Aufwand PT', '–', 'Zeilenhöhe 30, Umbruch'],
    ['Datenzeile', FONT, 9.5, 'Anthrazit', 'Verkaufsangebot erstellen', 'Text', 'Zebra ab 2. Zeile'],
    ['Summenzeile', `${FONT} Bold`, 10, 'Anthrazit auf Gold 20 %', 'Gesamt', 'siehe Spalte', 'doppelte Goldlinie'],
    ['Kennzahl', `${FONT} Bold`, 18, 'Gold auf Anthrazit', '492.003 €', '#,##0 €', 'nur Deckblatt'],
    ['Betrag', FONT, 9.5, 'Anthrazit', '2.550 €', '#,##0 €', 'rechtsbündig'],
    ['Einzelpreis', FONT, 9.5, 'Anthrazit', '91,00 €', '#,##0.00 €', 'rechtsbündig'],
    ['Aufwand', FONT, 9.5, 'Anthrazit', '2,0 PT', '#,##0.0 PT', 'rechtsbündig'],
    ['Anteil', FONT, 9.5, 'Slate 600', '64,2 %', '0.0%', 'rechtsbündig'],
    ['Hinweis', `${FONT} Italic`, 8.5, 'Slate 600', 'Customizing – abstimmen', 'Text', 'unter Abschnitt'],
  ]
  for (const [el, fnt, size, color, example, numFmt, rule] of typo) {
    wsS.getCell(r, 1).value = el
    wsS.getCell(r, 1).font = font(9.5, true)
    wsS.getCell(r, 1).alignment = align('left', 1)
    wsS.getCell(r, 2).value = fnt
    wsS.getCell(r, 2).font = font(9)
    wsS.getCell(r, 3).value = size
    wsS.getCell(r, 3).alignment = align('center')
    wsS.getCell(r, 3).font = font(9)
    wsS.getCell(r, 4).value = color
    wsS.getCell(r, 4).font = font(9, false, CI.slate600)
    wsS.getCell(r, 5).value = example
    wsS.getCell(r, 5).font = font(9)
    wsS.getCell(r, 6).value = numFmt
    wsS.getCell(r, 6).font = font(8.5, false, CI.slate600, false, 'Consolas')
    wsS.getCell(r, 7).value = rule
    wsS.getCell(r, 7).font = font(8.5, false, CI.slate600)
    r++
  }
  zebraGrid(wsS, typoFirst, r - 1, 1, 7)
  r++
  r = section(wsS, r, 'Aufbau- und Formatregeln', 7)
  const rules = [
    'Jedes Blatt beginnt mit einem Anthrazit-Kopfband (Zeilen 1–4) und einer goldenen Trennlinie; ab Zeile 6 sind die Fenster fixiert.',
    'Gold hinterlegte Zellen (10 % Gold) sind Eingabefelder. Alle übrigen Werte sind Formeln und sollten nicht überschrieben werden.',
    'Kosten entstehen ausschließlich aus Aufwand × Tagessatz der Phasenrolle (Blatt „8 · Parameter“).',
    'Summenzeilen tragen eine doppelte Goldlinie; die Gesamtinvestition steht auf Anthrazit mit goldenem Wert.',
    'Statusfarben: Grün = In Scope / aktiv, Orange = Optional, Rot = Customizing bzw. Gap.',
    'Gitternetzlinien sind deaktiviert; Struktur entsteht ausschließlich über Zellrahmen in Slate 200.',
    'Jede Datentabelle besitzt Filter und fixierte Kopfzeile; Datenbalken und Farbskalen ersetzen Diagramme.',
    'Druck: Querformat, auf Seitenbreite skaliert, Kopfzeile wiederholt, Fußzeile mit Seitenzahl und Vertraulichkeitshinweis.',
    `Schrift: CI-Schrift ist „${CI_FONT}“ (Web-Font der Plattform). Da sie keine Systemschrift ist, verwendet die Mappe „${FONT}“ als systemsicheren Ersatz.`,
  ]
  for (const n of rules) {
    wsS.mergeCells(r, 1, r, 7)
    const cell = wsS.getCell(r, 1)
    cell.value = `·  ${n}`
    cell.font = font(9, false, CI.slate600)
    cell.alignment = align('left', 1)
    wsS.getRow(r).height = 16
    r++
  }
  printSetup(wsS)

  /* ═════════════════════════════════════════════════════════════════════
     DECKBLATT
     ═════════════════════════════════════════════════════════════════════ */
  const wsC = wb.addWorksheet(SHEET.cover, { properties: { tabColor: { argb: `FF${CI.gold}` } } })
  wsC.views = [{ showGridLines: false }]
  ;[2.5, 16, 16, 16, 16, 16, 16, 16, 16, 2.5].forEach((w, i) => (wsC.getColumn(i + 1).width = w))
  for (let row = 1; row <= 11; row++) {
    for (let c = 1; c <= 10; c++) wsC.getCell(row, c).fill = fill(CI.anthracite)
  }
  wsC.getRow(1).height = 18
  wsC.getRow(2).height = 30
  wsC.getRow(3).height = 34
  wsC.getRow(4).height = 22
  wsC.getRow(5).height = 10
  wsC.getRow(6).height = 18
  wsC.mergeCells(2, 2, 2, 9)
  wsC.getCell(2, 2).value = 'COSMO CONSULT'
  wsC.getCell(2, 2).font = font(13, true, CI.gold)
  wsC.getCell(2, 2).alignment = align('left')
  wsC.mergeCells(3, 2, 3, 9)
  wsC.getCell(3, 2).value = 'Workshop- & Angebotskalkulation'
  wsC.getCell(3, 2).font = font(26, true, CI.white)
  wsC.getCell(3, 2).alignment = align('left')
  wsC.mergeCells(4, 2, 4, 9)
  wsC.getCell(4, 2).value = 'MBPC-Workshop · Success by Design · Angebotskalkulation'
  wsC.getCell(4, 2).font = font(11, false, CI.slate400)
  wsC.getCell(4, 2).alignment = align('left')
  for (let c = 2; c <= 9; c++) wsC.getCell(6, c).fill = fill(CI.gold)

  wsC.getRow(8).height = 16
  wsC.getRow(9).height = 30
  wsC.getRow(10).height = 16
  const kpis: [string, number, string, string][] = [
    ['Gesamtinvestition', calc.totalPeriod, EUR, `${period} Monate`],
    ['Dienstleistung einmalig', calc.serviceCostOneTime, EUR, 'inkl. Overhead'],
    ['Lizenzen / Monat', calc.licenseMonthly, EUR, 'Run-Rate'],
    ['Gesamtaufwand', calc.serviceDays, fmt.days, 'Personentage'],
  ]
  kpis.forEach(([label, value, numFmt, sub], i) => {
    const c0 = 2 + i * 2
    wsC.mergeCells(8, c0, 8, c0 + 1)
    wsC.mergeCells(9, c0, 9, c0 + 1)
    wsC.mergeCells(10, c0, 10, c0 + 1)
    const l = wsC.getCell(8, c0)
    l.value = label.toUpperCase()
    l.font = font(8, true, CI.slate400)
    l.alignment = { horizontal: 'left', vertical: 'bottom' }
    const v = wsC.getCell(9, c0)
    v.value = value
    v.numFmt = numFmt
    v.font = font(18, true, CI.gold)
    v.alignment = align('left')
    const s = wsC.getCell(10, c0)
    s.value = sub
    s.font = font(8, false, CI.slate400)
    s.alignment = { horizontal: 'left', vertical: 'top' }
  })

  r = 13
  r = section(wsC, r, 'Interessent & Projektrahmen', 10)
  const industry = findIndustry(prospect.industryId, params.customIndustries)
  const info: [string, string | number][] = [
    ['Unternehmen', prospect.company || '—'],
    ['Ansprechpartner', prospect.contact || '—'],
    ['Branche', (lang === 'de' ? industry?.label : industry?.labelEN) || prospect.industryId],
    ['Archetyp', lang === 'de' ? archetypeById(prospect.archetypeId).label : archetypeById(prospect.archetypeId).labelEN],
    ['Unternehmensgröße', prospect.size || '—'],
    ['Land (HQ)', prospect.country || '—'],
    ['Projektstart', prospect.projectStart || '—'],
    ['Go-Live (geplant)', prospect.goLive || '—'],
    ['Betrachtungszeitraum', `${period} Monate`],
    ['Environments', state.environments.map((e) => e.name).join(', ')],
    ['Anwender gesamt', state.environments.reduce((s, e) => s + e.users, 0)],
  ]
  for (const [k, v] of info) {
    wsC.mergeCells(r, 2, r, 3)
    wsC.mergeCells(r, 4, r, 9)
    const a = wsC.getCell(r, 2)
    a.value = k
    a.font = font(9.5, true)
    a.alignment = align('left', 1)
    a.fill = fill(CI.anthracite5)
    const b = wsC.getCell(r, 4)
    b.value = v
    b.font = font(9.5)
    b.alignment = align('left', 1)
    for (let c = 2; c <= 9; c++) wsC.getCell(r, c).border = cellBorder()
    wsC.getRow(r).height = 18
    r++
  }
  if (prospect.notes) {
    r++
    wsC.mergeCells(r, 2, r, 9)
    wsC.getCell(r, 2).value = 'Ausgangssituation'
    wsC.getCell(r, 2).font = font(9.5, true, CI.goldDark)
    wsC.getRow(r).height = 16
    r++
    wsC.mergeCells(r, 2, r + 1, 9)
    const note = wsC.getCell(r, 2)
    note.value = prospect.notes
    note.font = font(9.5, false, CI.slate600)
    note.alignment = { horizontal: 'left', vertical: 'top', wrapText: true, indent: 1 }
    for (let row = r; row <= r + 1; row++) {
      for (let c = 2; c <= 9; c++) wsC.getCell(row, c).border = cellBorder()
      wsC.getRow(row).height = 18
    }
    r += 2
  }
  r++

  r = section(wsC, r, 'Blattverzeichnis', 10)
  const nav: [string, string][] = [
    [SHEET.quote, 'Angebotssumme: Dienstleistung, Overhead, Lizenzen, Gesamtinvestition'],
    [SHEET.scope, 'Feature-Ebene: Aufwand je Success-by-Design-Phase, Kosten je Feature'],
    [SHEET.phases, 'Verdichtung je SbD-Phase inkl. Rolle und Tagessatz'],
    [SHEET.processes, 'Fit-Score, Aufwand und Kosten je MBPC-Prozess'],
    [SHEET.licenses, 'Lizenzzeilen je Environment – monatlich, jährlich, Zeitraum'],
    [SHEET.overhead, 'Fachübergreifende Rollen und Zuschläge'],
    [SHEET.environments, 'Environments, Mandanten und Kennzahlen je Land'],
    [SHEET.parameters, 'Rollen & Tagessätze, Rolle je Phase, Währung, Zeitraum'],
    [SHEET.catalog, 'Referenz: Prozesse, Bereiche und Prozessschritte'],
    [SHEET.styleguide, 'Farben, Schrift und Formatregeln dieser Arbeitsmappe'],
  ]
  for (const [name, desc] of nav) {
    wsC.mergeCells(r, 2, r, 3)
    wsC.mergeCells(r, 4, r, 9)
    const a = wsC.getCell(r, 2)
    a.value = name
    a.font = font(9.5, true)
    a.alignment = align('left', 1)
    a.fill = fill(CI.gold10)
    const b = wsC.getCell(r, 4)
    b.value = desc
    b.font = font(9, false, CI.slate600)
    b.alignment = align('left', 1)
    for (let c = 2; c <= 9; c++) wsC.getCell(r, c).border = cellBorder()
    wsC.getRow(r).height = 17
    r++
  }
  r++
  wsC.mergeCells(r, 2, r, 9)
  wsC.getCell(r, 2).value =
    'Alle gold hinterlegten Felder sind Eingabefelder. Kosten, Summen und Kennzahlen berechnen sich automatisch über Formeln aus dem Blatt „8 · Parameter“.'
  wsC.getCell(r, 2).font = font(8.5, false, CI.slate600, true)
  printSetup(wsC, { landscape: false })

  /* ---------- Blattreihenfolge & benannte Bezüge ---------- */
  const order = [SHEET.cover, SHEET.quote, SHEET.scope, SHEET.phases, SHEET.processes, SHEET.licenses,
    SHEET.overhead, SHEET.environments, SHEET.parameters, SHEET.catalog, SHEET.styleguide]
  order.forEach((name, i) => {
    const sheet = wb.getWorksheet(name) as (Worksheet & { orderNo: number }) | undefined
    // `orderNo` steuert die Registerreihenfolge in ExcelJS (nicht in den Typings enthalten).
    if (sheet) sheet.orderNo = i
  })

  const defineName = (name: string, location: string) => {
    try {
      wb.definedNames.add(location, name)
    } catch {
      /* benannter Bezug ist optional */
    }
  }
  defineName('Gesamtinvestition', ref(SHEET.quote, abs(5, grandTotalRow)))
  defineName('Feature_Aufwand_PT', R_FEATURE_DAYS)
  defineName('Feature_Kosten', R_FEATURE_COST)
  defineName('Overhead_Aufwand_PT', ref(SHEET.overhead, abs(7, ohTotalRow)))
  defineName('Overhead_Kosten', ref(SHEET.overhead, abs(8, ohTotalRow)))
  defineName('Lizenzen_Monat', ref(SHEET.licenses, abs(6, licTotalRow)))
  defineName('Lizenzen_Zeitraum', ref(SHEET.licenses, abs(8, licTotalRow)))
  defineName('Betrachtungszeitraum', R_PERIOD)

  return wb
}

/** Baut die Angebots-Arbeitsmappe und startet den Download im Browser. */
export async function exportExcelQuote(state: ProjectState, lang: Lang = 'de'): Promise<void> {
  const wb = await buildQuoteWorkbook(state, lang)
  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const safe =
    (state.prospect.company || 'Interessent').replace(/[^\p{L}\p{N}\-_ ]/gu, '').trim() || 'Interessent'
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${safe} — Angebotskalkulation.xlsx`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

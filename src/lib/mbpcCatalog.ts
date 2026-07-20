import type {
  CatalogArea,
  CatalogProcess,
  Environment,
  MbpcArea,
  MbpcCatalog,
  MbpcProcess,
  MbpcWorkload,
  ProjectState,
} from '../types'
import { CATALOG } from '../data/catalog'
import { translateMbpcTitle } from './mbpcTranslations'

/* ═══════════════════════════════════════════════════════════════════════
   Microsoft Business Process Catalog (Workload-MBPC)
   Import-Schnittstelle für den workload-orientierten MBPC-Export
   (Azure DevOps Business Process Catalog, .xlsx).

   Hierarchie (kodiert über die Title-Spalten / Work item type):
     End to end (Title 2)   → CatalogProcess
       Process area (Title 3) → CatalogArea
         Process (Title 4)      → Step / Feature
   Scenarios/Test cases (Title 5+) werden nicht ins Scoping übernommen.
   ═══════════════════════════════════════════════════════════════════════ */

const MBPC_KEY = 'cc-mbpc-catalog-v1'

/** Erwartete Spaltenüberschriften im MBPC-Export. */
const COL = {
  workItemType: 'Work item type',
  title2: 'Title 2',
  title3: 'Title 3',
  title4: 'Title 4',
  products: 'Products MS BPC',
  family: 'Application family MS BPC',
} as const

/** Produkt → Anwendungsfamilie. Bestimmt die Gruppierung in der Workload-Auswahl. */
const FAMILY_MAP: Record<string, string> = {
  'Business Central': 'Business Central',
  Finance: 'Finance & Operations',
  'Supply Chain Management': 'Finance & Operations',
  Commerce: 'Finance & Operations',
  'Project Operations': 'Finance & Operations',
  'Human Resources': 'Finance & Operations',
  Sales: 'Customer Engagement',
  'Customer Service': 'Customer Engagement',
  'Field Service': 'Customer Engagement',
  'Customer Insights Journey': 'Customer Engagement',
  'Customer Insights Data': 'Customer Engagement',
  'Customer Voice': 'Customer Engagement',
  'Power BI': 'Power Platform',
  'Power Automate': 'Power Platform',
  'Power Apps': 'Power Platform',
  'Power Pages': 'Power Platform',
  'Microsoft 365': 'Productivity',
  Teams: 'Productivity',
  SharePoint: 'Productivity',
  Azure: 'Azure & Cloud',
  'Microsoft Cloud for Sustainability': 'Azure & Cloud',
  Other: 'Sonstige',
}

/** Bevorzugte Reihenfolge der Anwendungsfamilien. */
const FAMILY_ORDER = [
  'Business Central',
  'Finance & Operations',
  'Customer Engagement',
  'Power Platform',
  'Productivity',
  'Azure & Cloud',
  'Sonstige',
]

/** Emoji-Icon für einen End-to-End-Prozess anhand von Schlüsselwörtern. */
function iconForProcess(title: string): string {
  const t = title.toLowerCase()
  if (t.includes('cash') || t.includes('order')) return '💰'
  if (t.includes('procure') || t.includes('source') || t.includes('pay')) return '🛒'
  if (t.includes('report') || t.includes('record')) return '📊'
  if (t.includes('inventory') || t.includes('deliver') || t.includes('warehouse')) return '📦'
  if (t.includes('produce') || t.includes('plan') || t.includes('manufactur')) return '🏭'
  if (t.includes('design') || t.includes('concept') || t.includes('market') || t.includes('retire')) return '🧬'
  if (t.includes('project')) return '📐'
  if (t.includes('hire') || t.includes('retire') || t.includes('people')) return '👥'
  if (t.includes('service') || t.includes('case') || t.includes('resolution')) return '🛠️'
  if (t.includes('acquire') || t.includes('asset') || t.includes('dispose')) return '🏗️'
  if (t.includes('administer') || t.includes('operate') || t.includes('govern')) return '⚙️'
  if (t.includes('prospect') || t.includes('quote') || t.includes('lead')) return '🎯'
  if (t.includes('forecast') || t.includes('supply')) return '📈'
  return '📋'
}

function slug(s: string): string {
  return (
    'ms-' +
    s
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60)
  )
}

function familyOf(product: string): string {
  return FAMILY_MAP[product] || 'Sonstige'
}

function splitProducts(raw: string): string[] {
  return raw
    .split(';')
    .map((x) => x.trim())
    .filter(Boolean)
}

/**
 * Parst einen hochgeladenen MBPC-Export (.xlsx) in einen workload-orientierten Katalog.
 * Der Baum wird über „Work item type" (End to end / Process area / Process) aufgebaut.
 */
export async function parseMbpcWorkbook(file: File): Promise<MbpcCatalog> {
  const XLSX = await import('xlsx')
  const buffer = await file.arrayBuffer()
  const wb = XLSX.read(buffer, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })

  const get = (row: Record<string, unknown>, key: string): string => {
    const found = Object.keys(row).find((k) => String(k).trim() === key)
    return found ? String(row[found] ?? '').trim() : ''
  }

  const processes: MbpcProcess[] = []
  const workloadCount: Record<string, { label: string; count: number }> = {}
  let curProc: MbpcProcess | null = null
  let curArea: MbpcArea | null = null

  const ensureProc = (title: string): MbpcProcess => {
    const p: MbpcProcess = { id: slug(title || 'process'), title: title || '(Allgemein)', icon: iconForProcess(title), workloads: [], areas: [] }
    processes.push(p)
    curProc = p
    curArea = null
    return p
  }
  const ensureArea = (title: string): MbpcArea => {
    if (!curProc) ensureProc('(Allgemein)')
    const a: MbpcArea = { title: title || '(Allgemein)', steps: [] }
    curProc!.areas.push(a)
    curArea = a
    return a
  }

  for (const row of rows) {
    const type = get(row, COL.workItemType)
    if (type === 'End to end') {
      ensureProc(get(row, COL.title2))
    } else if (type === 'Process area') {
      if (!curProc) ensureProc(get(row, COL.title2) || '(Allgemein)')
      ensureArea(get(row, COL.title3))
    } else if (type === 'Process') {
      if (!curProc) ensureProc(get(row, COL.title2) || '(Allgemein)')
      if (!curArea) ensureArea(get(row, COL.title3) || '(Allgemein)')
      const workloads = splitProducts(get(row, COL.products))
      curArea!.steps.push({ title: get(row, COL.title4) || '(Prozess)', workloads })
    }
    // Scenario / Test case / System process / Tree → ignorieren
  }

  // Prozess-Workloads aggregieren + globale Workload-Zählung
  const uniqueProcCounted = new Set<string>()
  for (const p of processes) {
    const set = new Set<string>()
    for (const a of p.areas) for (const s of a.steps) for (const w of s.workloads) set.add(w)
    p.workloads = [...set]
    for (const w of p.workloads) {
      const key = w
      if (!workloadCount[key]) workloadCount[key] = { label: w, count: 0 }
      const tag = `${p.id}|${w}`
      if (!uniqueProcCounted.has(tag)) {
        workloadCount[key].count++
        uniqueProcCounted.add(tag)
      }
    }
  }

  // leere Prozesse (ohne Steps) entfernen
  const nonEmpty = processes.filter((p) => p.areas.some((a) => a.steps.length > 0))

  const workloads: MbpcWorkload[] = Object.values(workloadCount)
    .map((w) => ({ id: slug(w.label).replace(/^ms-/, ''), label: w.label, family: familyOf(w.label), count: w.count }))
    .sort((a, b) => {
      const fa = FAMILY_ORDER.indexOf(a.family)
      const fb = FAMILY_ORDER.indexOf(b.family)
      if (fa !== fb) return fa - fb
      return b.count - a.count
    })

  const families = FAMILY_ORDER.filter((f) => workloads.some((w) => w.family === f))

  let areaCount = 0
  let stepCount = 0
  for (const p of nonEmpty) {
    areaCount += p.areas.length
    for (const a of p.areas) stepCount += a.steps.length
  }

  return {
    processes: nonEmpty,
    workloads,
    families,
    importedAt: new Date().toISOString(),
    fileName: file.name,
    processCount: nonEmpty.length,
    areaCount,
    stepCount,
  }
}

/* ---------- Persistenz (dauerhafte Import-Schnittstelle) ---------- */

let _cache: MbpcCatalog | null | undefined

export function saveMbpcCatalog(catalog: MbpcCatalog): void {
  _cache = catalog
  try {
    localStorage.setItem(MBPC_KEY, JSON.stringify(catalog))
  } catch {
    /* Speicher voll / nicht verfügbar */
  }
}

export function loadMbpcCatalog(): MbpcCatalog | null {
  if (_cache !== undefined) return _cache
  try {
    const raw = localStorage.getItem(MBPC_KEY)
    _cache = raw ? (JSON.parse(raw) as MbpcCatalog) : null
  } catch {
    _cache = null
  }
  return _cache
}

export function clearMbpcCatalog(): void {
  _cache = null
  try {
    localStorage.removeItem(MBPC_KEY)
  } catch {
    /* ignore */
  }
}

/** Map: Workload-ID → Label (für Badges/Anzeige). */
export function workloadLabelMap(catalog: MbpcCatalog | null): Record<string, string> {
  const m: Record<string, string> = {}
  if (catalog) for (const w of catalog.workloads) m[w.id] = w.label
  return m
}

/* ---------- Konvertierung in das Scoping-Katalogmodell ---------- */

/**
 * Wandelt den MBPC in das bestehende CatalogProcess-Modell um.
 * Die Workload-Auswahl filtert auf End-to-End-Prozess-Ebene (Index-stabil):
 * Ein Prozess erscheint, wenn er mindestens einen der gewählten Workloads enthält.
 * Leere Auswahl = alle Prozesse.
 */
function convert(catalog: MbpcCatalog, selected: string[]): CatalogProcess[] {
  const labelToId = new Map(catalog.workloads.map((w) => [w.label, w.id]))
  const sel = new Set(selected)
  const matches = (p: MbpcProcess): boolean => {
    if (sel.size === 0) return true
    return p.workloads.some((w) => sel.has(labelToId.get(w) || ''))
  }
  return catalog.processes.filter(matches).map((p): CatalogProcess => {
    const areas: CatalogArea[] = p.areas
      .filter((a) => a.steps.length > 0)
      .map((a): CatalogArea => {
        const stepsEN = a.steps.map((s) => s.title)
        const steps = stepsEN.map((s) => translateMbpcTitle(s).de)
        const wl = [...new Set(a.steps.flatMap((s) => s.workloads))]
        const hint = wl.length ? `Workloads: ${wl.join(', ')}` : ''
        return { t: translateMbpcTitle(a.title).de, en: a.title, hint, hintEN: hint, bc: wl, steps, stepsEN }
      })
    return {
      id: p.id,
      catId: 'MS',
      icon: p.icon,
      group: 'primary',
      nameDE: translateMbpcTitle(p.title).de,
      nameEN: p.title,
      intro: `Microsoft Business Process Catalog · End-to-End-Prozess „${p.title}".`,
      introEN: `Microsoft Business Process Catalog · end-to-end process “${p.title}”.`,
      areas,
    }
  })
}

let _memoKey = ''
let _memoResult: CatalogProcess[] = []

/** Liefert den aktiven Prozesskatalog für ein Environment (Standard-MBPC oder Workload-MBPC). */
export function catalogForEnvironment(env: Environment | undefined): CatalogProcess[] {
  if (env?.catalogSource === 'mbpc') {
    const c = loadMbpcCatalog()
    if (c) {
      const workloads = env.workloads ?? []
      const key = `${c.importedAt}|${[...workloads].sort().join(',')}`
      if (key !== _memoKey) {
        _memoKey = key
        _memoResult = convert(c, workloads)
      }
      return _memoResult
    }
  }
  return CATALOG
}

/** Vereinigte Prozessliste über alle Environments (für die aggregierte Zusammenfassung). */
export function catalogsForState(state: ProjectState): CatalogProcess[] {
  const seen = new Set<string>()
  const out: CatalogProcess[] = []
  for (const e of state.environments) {
    for (const p of catalogForEnvironment(e)) {
      if (!seen.has(p.id)) {
        seen.add(p.id)
        out.push(p)
      }
    }
  }
  return out.length ? out : CATALOG
}

/* ═══════════════════════════════════════════════════════════════════════
   COSMO Standard-MBPC (Microsoft Business Process Catalog · COSMO-Aufbau)
   ───────────────────────────────────────────────────────────────────────
   Der gebündelte Standard-Prozesskatalog (src/data/cosmoStandard.json) ist
   aus der COSMO-MBPC-Excel-Vorlage generiert. Er lässt sich jederzeit über
   dieselbe Vorlage neu importieren (Persistenz in localStorage überschreibt
   den gebündelten Default).

   Struktur der Vorlage (Register „MBPC"):
     Ebene 1  → CatalogProcess          (End-to-End-Prozess)
       Ebene 2  → CatalogArea           (Prozessbereich)
         Paket (Ebene 2,5) → step       (scopebares Feature mit Modul + SbD-Aufwand)

   Aufwands-Zuordnung (Personentage / Leistungstage):
     initiate = „I&S Summe"      build = „B&I Summe"
     prepare  = „Prepare … LT"   operate = „Operate … LT"
     strategize entfällt (nicht kalkulationsrelevant).
   ═══════════════════════════════════════════════════════════════════════ */
import type { CatalogProcess, PhaseEffort } from '../types'
import bundled from '../data/cosmoStandard.json'

const STANDARD_KEY = 'cc-cosmo-standard-v1'

export interface CosmoStandardMeta {
  fileName: string
  importedAt: string
  processCount: number
  areaCount: number
  packageCount: number
  moduleCount: number
}

interface StoredCosmoStandard {
  meta: CosmoStandardMeta
  catalog: CatalogProcess[]
}

const BUNDLED_CATALOG = bundled as unknown as CatalogProcess[]

const BUNDLED_META: CosmoStandardMeta = {
  fileName: 'COSMO Standard-MBPC (gebündelt)',
  importedAt: '2025-05-01T00:00:00.000Z',
  ...countCatalog(BUNDLED_CATALOG),
}

function countCatalog(catalog: CatalogProcess[]): {
  processCount: number
  areaCount: number
  packageCount: number
  moduleCount: number
} {
  let areaCount = 0
  let packageCount = 0
  let moduleCount = 0
  for (const p of catalog) {
    areaCount += p.areas.length
    for (const a of p.areas) {
      packageCount += a.steps.length
      moduleCount += (a.stepModule ?? []).filter((m) => m && m.trim()).length
    }
  }
  return { processCount: catalog.length, areaCount, packageCount, moduleCount }
}

/* ---------- Persistenz & Cache ---------- */

let _cache: StoredCosmoStandard | null | undefined

function readStore(): StoredCosmoStandard | null {
  if (_cache !== undefined) return _cache
  try {
    const raw = localStorage.getItem(STANDARD_KEY)
    _cache = raw ? (JSON.parse(raw) as StoredCosmoStandard) : null
  } catch {
    _cache = null
  }
  return _cache
}

/** Aktiver Standard-Prozesskatalog (importierte Fassung oder gebündelter Default). */
export function loadCosmoStandardCatalog(): CatalogProcess[] {
  const stored = readStore()
  return stored?.catalog?.length ? stored.catalog : BUNDLED_CATALOG
}

/** Metadaten der aktiven Standard-Fassung (für die Import-Anzeige). */
export function loadCosmoStandardMeta(): CosmoStandardMeta {
  const stored = readStore()
  return stored?.meta ?? BUNDLED_META
}

/** true, wenn aktuell eine importierte Fassung (kein gebündelter Default) aktiv ist. */
export function hasImportedCosmoStandard(): boolean {
  return !!readStore()
}

export function clearCosmoStandard(): void {
  _cache = undefined
  try {
    localStorage.removeItem(STANDARD_KEY)
  } catch {
    /* ignore */
  }
  _cache = undefined
}

function save(catalog: CatalogProcess[], meta: CosmoStandardMeta): void {
  const stored: StoredCosmoStandard = { catalog, meta }
  _cache = stored
  try {
    localStorage.setItem(STANDARD_KEY, JSON.stringify(stored))
  } catch {
    /* Speicher voll / nicht verfügbar – In-Memory-Cache bleibt aktiv */
  }
}

/* ---------- Import (COSMO-MBPC-Excel neu einlesen) ---------- */

const ICONS: Record<number, string> = {
  10: '🏭', 20: '🛟', 30: '💡', 40: '⚙️', 50: '📈', 55: '👥', 60: '📦', 65: '💰',
  70: '🏭', 75: '🛒', 80: '📊', 85: '🎯', 90: '📒', 95: '🔧', 99: '🛡️',
}
const GROUP: Record<number, CatalogProcess['group']> = {
  50: 'manage', 55: 'support', 90: 'support', 99: 'support',
}

function num(v: unknown): number {
  if (v === '' || v == null) return 0
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

function slug(s: string): string {
  return String(s)
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

interface RawArea {
  t: string
  en: string
  hint: string
  hintEN: string
  bc: string[]
  steps: string[]
  stepsEN: string[]
  stepModule: string[]
  stepEffort: PhaseEffort[]
}
interface RawProc extends Omit<CatalogProcess, 'areas'> {
  _areas: Map<string, RawArea>
}

/** Wandelt die Zeilenmatrix des Registers „MBPC" in das CatalogProcess-Modell. */
function rowsToCatalog(rows: unknown[][]): CatalogProcess[] {
  // Kopfzeile finden (enthält „Paket (Ebene 2,5)")
  let hi = 0
  for (let i = 0; i < rows.length; i++) {
    if (rows[i]?.some((c) => String(c).trim() === 'Paket (Ebene 2,5)')) {
      hi = i
      break
    }
  }
  const header = (rows[hi] ?? []).map((c) => String(c).trim())
  const findCol = (exact: string, startsWith?: string): number => {
    let idx = header.findIndex((h) => h === exact)
    if (idx < 0 && startsWith) idx = header.findIndex((h) => h.startsWith(startsWith))
    return idx
  }
  const C = {
    type: 0,
    e1: findCol('Ebene 1', 'Ebene 1'),
    e2: header.findIndex((h) => h.startsWith('Ebene 2') && !h.includes('2,5')),
    paket: findCol('Paket (Ebene 2,5)'),
    modul: findCol('Modul (Lizenzierung)'),
    is: findCol('I&S Summe'),
    bi: findCol('B&I Summe'),
    prep: findCol('Prepare Aufwände in LT'),
    op: findCol('Operate Aufwände in LT'),
  }
  if (C.e1 < 0) C.e1 = 1
  if (C.e2 < 0) C.e2 = 2

  const procMap = new Map<string, RawProc>()
  let curE1 = ''
  let curE2 = ''

  for (let i = hi + 1; i < rows.length; i++) {
    const r = rows[i] ?? []
    const type = String(r[C.type] ?? '').trim()
    const e1 = String(r[C.e1] ?? '').trim()
    const e2 = String(r[C.e2] ?? '').trim()
    const paket = String(r[C.paket] ?? '').trim()
    if (e1) curE1 = e1
    if (e2) curE2 = e2
    if (!curE1) continue

    if (!procMap.has(curE1)) {
      const numPrefix = parseInt(curE1.match(/^\d+/)?.[0] ?? '0', 10)
      procMap.set(curE1, {
        id: slug(curE1),
        catId: numPrefix || 'MBPC',
        icon: ICONS[numPrefix] || '🔷',
        group: GROUP[numPrefix] || 'primary',
        nameDE: curE1,
        nameEN: curE1,
        intro: `Microsoft Business Process Catalog · End-to-End-Prozess „${curE1}“.`,
        introEN: `Microsoft Business Process Catalog · end-to-end process “${curE1}”.`,
        cosmo: true,
        _areas: new Map(),
      })
    }
    const proc = procMap.get(curE1)!
    if (!curE2) continue
    if (!proc._areas.has(curE2)) {
      proc._areas.set(curE2, {
        t: curE2, en: curE2, hint: '', hintEN: '', bc: [],
        steps: [], stepsEN: [], stepModule: [], stepEffort: [],
      })
    }
    const isPaket = type.toLowerCase() === 'paket' || (!!paket && type.toLowerCase() !== 'epic')
    if (!paket || !isPaket) continue

    const area = proc._areas.get(curE2)!
    const modul = String(r[C.modul] ?? '').replace(/"/g, '').trim()
    const effort: PhaseEffort = {
      strategize: 0,
      initiate: num(r[C.is]),
      build: num(r[C.bi]),
      prepare: num(r[C.prep]),
      operate: num(r[C.op]),
    }
    area.steps.push(paket)
    area.stepsEN.push(paket)
    area.stepModule.push(modul)
    area.stepEffort.push(effort)
  }

  return [...procMap.values()]
    .map((p): CatalogProcess => {
      const { _areas, ...rest } = p
      return { ...rest, areas: [..._areas.values()].filter((a) => a.steps.length > 0) }
    })
    .filter((p) => p.areas.length > 0)
}

/**
 * Liest die COSMO-MBPC-Excel-Vorlage neu ein, persistiert sie als aktiven
 * Standard-Katalog und liefert das Ergebnis samt Metadaten.
 */
export async function parseCosmoMbpcWorkbook(
  file: File,
): Promise<{ catalog: CatalogProcess[]; meta: CosmoStandardMeta }> {
  const XLSX = await import('xlsx')
  const buffer = await file.arrayBuffer()
  const wb = XLSX.read(buffer, { type: 'array' })
  const sheetName = wb.SheetNames.find((n) => /^mbpc$/i.test(String(n).trim())) ?? wb.SheetNames[0]
  const ws = wb.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: '' })

  const catalog = rowsToCatalog(rows)
  if (!catalog.length) throw new Error('Keine Pakete gefunden – bitte die COSMO-MBPC-Vorlage prüfen.')

  const meta: CosmoStandardMeta = {
    fileName: file.name,
    importedAt: new Date().toISOString(),
    ...countCatalog(catalog),
  }
  save(catalog, meta)
  return { catalog, meta }
}

/* ---------- Hilfen für Aufwand & Modul-Zuordnung ---------- */

/** SbD-Aufwandsvorschlag eines Pakets (oder null, wenn nicht hinterlegt). */
export function stepEffortFor(
  catalog: CatalogProcess[],
  processId: string,
  areaIdx: number,
  stepIdx: number,
): PhaseEffort | null {
  const eff = catalog.find((p) => p.id === processId)?.areas[areaIdx]?.stepEffort?.[stepIdx]
  return eff ?? null
}

/** Modul-Alternativen eines Pakets (splittet „A OR B OR Standard", filtert Leerwerte). */
export function stepModulesFor(
  catalog: CatalogProcess[],
  processId: string,
  areaIdx: number,
  stepIdx: number,
): string[] {
  const raw = catalog.find((p) => p.id === processId)?.areas[areaIdx]?.stepModule?.[stepIdx] ?? ''
  return parseModules(raw)
}

/** Zerlegt einen Modul-Zellwert in einzelne Modul-/Lizenz-Alternativen. */
export function parseModules(raw: string): string[] {
  return String(raw)
    .split(/\s+OR\s+/i)
    .map((m) => m.replace(/"/g, '').trim())
    .filter(Boolean)
}

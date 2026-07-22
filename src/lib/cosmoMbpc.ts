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

/* ---------- Fest integrierter Life-Science-Prozess ----------
   „500 Validierung bis Compliance" ist ein COSMO-Kernprozess für regulierte
   Industrien (Pharma, MedTech, Life Sciences, Chemie, Food). Er ist NICHT
   Teil der Microsoft-MBPC-Excel-Vorlage und wird daher fest ergänzt – auch
   nach einem Re-Import bleibt er im Standard-Katalog erhalten. Die Nummer 500
   liegt bewusst außerhalb des Microsoft-Nummernkreises (10–99); die
   „‹Start› bis ‹Ende›"-Nomenklatur folgt der Microsoft-MBPC-Konvention. Die
   Prozess-ID „quality-to-compliance" entspricht dem Branchen-Overlay, damit
   die Vorbelegung nach Branche (Life Science) den Prozess automatisch
   markiert. */
const LS_EFFORT: PhaseEffort = { strategize: 0, initiate: 0.5, build: 1.5, prepare: 0.5, operate: 0.25 }

interface LsAreaDef {
  t: string
  en: string
  hint: string
  hintEN: string
  bc: string[]
  steps: string[]
  stepsEN: string[]
  module: string
}

const LS_AREAS: LsAreaDef[] = [
  {
    t: 'Wareneingangs- & Qualitätsprüfung',
    en: 'Incoming and quality inspection',
    hint: 'Prüfpläne, Prüfmerkmale und Frage-/Antwort-Vorlagen für Wareneingang, Prozess und Fertigung definieren und QC-Tests durchführen.',
    hintEN: 'Define inspection plans, characteristics and Q&A templates for incoming, process and production and run QC tests.',
    bc: ['COSMO Quality Assurance', 'Quality Check (Prüfvorlagen)', 'QC-Setup', 'Prüflose'],
    module: 'COSMO Quality Assurance',
    steps: ['Prüfplan & Prüfmerkmale definieren', 'Prüfvorlage (Q&A) zuordnen', 'QC-Test bei Wareneingang/Fertigung anlegen', 'Prüfergebnisse erfassen', 'Prüfentscheid dokumentieren'],
    stepsEN: ['Define inspection plan & characteristics', 'Assign inspection template (Q&A)', 'Create QC test at receipt/production', 'Record inspection results', 'Document inspection decision'],
  },
  {
    t: 'Sperr-, Quarantäne- & Freigabesteuerung',
    en: 'Quarantine and release control',
    hint: 'Bestände über QC-Status sperren, in Quarantäne legen oder freigeben; Verwendungsentscheid und Chargenfreigabe dokumentieren.',
    hintEN: 'Block, quarantine or release stock via QC status; document usage decision and batch release.',
    bc: ['QC-Status', 'Quarantäne / Sperrbestand', 'Verwendungsentscheid', 'Chargenfreigabe'],
    module: 'COSMO Quality Assurance',
    steps: ['QC-Status einrichten', 'Ware in Quarantäne buchen', 'Charge bewerten', 'Verwendungsentscheid treffen', 'Charge freigeben oder sperren'],
    stepsEN: ['Set up QC status', 'Post goods to quarantine', 'Assess batch', 'Make usage decision', 'Release or block batch'],
  },
  {
    t: 'Chargenrückverfolgung & UDI',
    en: 'Batch traceability and UDI',
    hint: 'Lückenlose Chargen-/Los-Rückverfolgung, UDI-Kennzeichnung sowie Haltbarkeit und Restlaufzeit (MHD) in Planung und Logistik.',
    hintEN: 'Full batch/lot traceability, UDI labeling and shelf life / remaining life (expiry) in planning and logistics.',
    bc: ['Batch Tracking', 'Los-/Chargenverfolgung', 'UDI-Kennzeichnung', 'Restlaufzeit / MHD (MRP)'],
    module: 'COSMO Batch Tracking',
    steps: ['Chargen-/Los-Nummern vergeben', 'UDI-Kennzeichnung erzeugen', 'Vorwärts-/Rückwärtsverfolgung', 'Restlaufzeit / MHD überwachen', 'Rückruf simulieren'],
    stepsEN: ['Assign batch/lot numbers', 'Generate UDI labeling', 'Forward/backward tracing', 'Monitor remaining life / expiry', 'Simulate recall'],
  },
  {
    t: 'Abweichungs-, Reklamations- & CAPA-Management',
    en: 'Deviation, complaint and CAPA management',
    hint: 'Abweichungen, Out-of-Spec-Fälle und Reklamationen erfassen, Ursachen analysieren und Korrektur-/Vorbeugemaßnahmen (CAPA) steuern.',
    hintEN: 'Record deviations, out-of-spec cases and complaints, analyze root causes and steer corrective/preventive actions (CAPA).',
    bc: ['COSMO Quality Management Pack', 'Incident: Abweichung / Out of Spec', 'Reklamation (Complaint)', 'CAPA', 'Webcon Connector'],
    module: 'COSMO Quality Management Pack',
    steps: ['Abweichung / Out of Spec erfassen', 'Reklamation aufnehmen', 'Ursachenanalyse (Root Cause)', 'CAPA definieren & umsetzen', 'Wirksamkeit prüfen & abschließen'],
    stepsEN: ['Record deviation / out of spec', 'Log complaint', 'Root cause analysis', 'Define & implement CAPA', 'Verify effectiveness & close'],
  },
  {
    t: 'Änderungslenkung (Change Control)',
    en: 'Change control',
    hint: 'Änderungsanträge stellen, Auswirkungen und Risiken bewerten, genehmigen und die kontrollierte Umsetzung nachweisen.',
    hintEN: 'Raise change requests, assess impact and risk, approve and evidence controlled implementation.',
    bc: ['Change Control (QMP)', 'Genehmigungsworkflow', 'Risiko- & Impact-Bewertung'],
    module: 'COSMO Quality Management Pack',
    steps: ['Änderungsantrag stellen', 'Impact- & Risikobewertung', 'Änderung genehmigen', 'Umsetzung steuern', 'Änderung dokumentieren'],
    stepsEN: ['Raise change request', 'Impact & risk assessment', 'Approve change', 'Steer implementation', 'Document change'],
  },
  {
    t: 'Dokumentenlenkung & Schulung',
    en: 'Document control and training',
    hint: 'Gelenkte SOPs und Dokumente über den vollen Lebenszyklus inkl. Schulungsnachweis – GAMP-5-konform.',
    hintEN: 'Controlled SOPs and documents across the full lifecycle incl. training records – GAMP 5 compliant.',
    bc: ['Document Control (cDMS)', 'GAMP 5 / GxP', 'Elektronische Signatur', 'Schulungsmanagement', 'COSMO Workflow'],
    module: 'COSMO Document Control (cDMS)',
    steps: ['SOP / Dokument erstellen', 'Review- & Freigabeworkflow', 'Elektronische Signatur', 'Versionierung & Archivierung', 'Schulung zuweisen & nachweisen'],
    stepsEN: ['Create SOP / document', 'Review & approval workflow', 'Electronic signature', 'Versioning & archiving', 'Assign & evidence training'],
  },
  {
    t: 'Regulatory Affairs & Marktzulassung',
    en: 'Regulatory affairs and market approval',
    hint: 'Regulatorische Anforderungen, technische Dokumentation, Konformitätsbewertung sowie Zulassungen, Registrierungen und Kennzeichnung verwalten.',
    hintEN: 'Manage regulatory requirements, technical documentation, conformity assessment and approvals, registrations and labeling.',
    bc: ['COSMO Regulatory Affairs', 'Technische Dokumentation', 'Konformitätsbewertung', 'Labeling'],
    module: 'COSMO Regulatory Affairs',
    steps: ['Regulatorische Anforderungen erfassen', 'Technische Dokumentation pflegen', 'Konformität bewerten', 'Zulassung / Registrierung verwalten', 'Kennzeichnung & Labeling freigeben'],
    stepsEN: ['Capture regulatory requirements', 'Maintain technical documentation', 'Assess conformity', 'Manage approval / registration', 'Release labeling'],
  },
  {
    t: 'Audit, Inspektion & Systemvalidierung',
    en: 'Audit, inspection and computer system validation',
    hint: 'Audits und Inspektionen planen und durchführen, Findings und Maßnahmen verfolgen sowie die computergestützte Systemvalidierung (CSV) sicherstellen.',
    hintEN: 'Plan and run audits and inspections, track findings and actions and ensure computer system validation (CSV).',
    bc: ['Audit Management', 'Computersystemvalidierung (CSV)', 'Audit Trail', 'GAMP 5'],
    module: 'COSMO Audit Management',
    steps: ['Auditplan erstellen', 'Interne / externe Audits durchführen', 'Findings & Maßnahmen verfolgen', 'Systemvalidierung (CSV / GAMP 5)', 'Audit-Trail & Inspektionsbereitschaft'],
    stepsEN: ['Create audit plan', 'Conduct internal / external audits', 'Track findings & actions', 'System validation (CSV / GAMP 5)', 'Audit trail & inspection readiness'],
  },
]

const LIFE_SCIENCE_PROCESS: CatalogProcess = {
  id: 'quality-to-compliance',
  catId: 500,
  icon: '🛡️',
  group: 'regulated',
  cosmo: true,
  nameDE: '500 Validierung bis Compliance',
  nameEN: '500 Validation to compliance',
  intro:
    'Regulierte End-to-End-Qualitäts- und Compliance-Prozesse für Pharma, MedTech, Life Sciences, Chemie und Food – von der Wareneingangs- und Chargenprüfung über Abweichungs- und CAPA-Management bis zu Dokumentenlenkung, Zulassung, Validierung und Audit.',
  introEN:
    'Regulated end-to-end quality and compliance processes for pharma, medtech, life sciences, chemicals and food – from incoming and batch inspection through deviation and CAPA management to document control, market approval, validation and audit.',
  areas: LS_AREAS.map((a) => ({
    t: a.t,
    en: a.en,
    hint: a.hint,
    hintEN: a.hintEN,
    bc: a.bc,
    steps: a.steps,
    stepsEN: a.stepsEN,
    stepModule: a.steps.map(() => a.module),
    stepEffort: a.steps.map(() => ({ ...LS_EFFORT })),
  })),
}

/** Ergänzt den fest integrierten Life-Science-Prozess, falls noch nicht enthalten. */
function withLifeScience(catalog: CatalogProcess[]): CatalogProcess[] {
  if (catalog.some((p) => p.id === LIFE_SCIENCE_PROCESS.id)) return catalog
  return [...catalog, LIFE_SCIENCE_PROCESS]
}

const BUNDLED_META: CosmoStandardMeta = {
  fileName: 'COSMO Standard-MBPC (gebündelt)',
  importedAt: '2025-05-01T00:00:00.000Z',
  ...countCatalog(withLifeScience(BUNDLED_CATALOG)),
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
  return withLifeScience(stored?.catalog?.length ? stored.catalog : BUNDLED_CATALOG)
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
    ...countCatalog(withLifeScience(catalog)),
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

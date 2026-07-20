/* ═══════════════════════════════════════════════════════════════════════
   Datenmodell der Workshop- & Angebots-Kalkulations-Plattform
   ═══════════════════════════════════════════════════════════════════════ */

export type Lang = 'de' | 'en'

export type ScopeStatus = 'in' | 'opt' | 'out' | 'unset'

/** Die fünf Success-by-Design-Phasen */
export type PhaseKey = 'strategize' | 'initiate' | 'build' | 'prepare' | 'operate'

export const PHASE_KEYS: PhaseKey[] = ['strategize', 'initiate', 'build', 'prepare', 'operate']

/* ---------- MBPC-Katalog (statischer Seed) ---------- */

export interface CatalogArea {
  t: string
  en: string
  hint: string
  hintEN: string
  bc: string[]
  steps: string[]
  stepsEN: string[]
}

export interface CatalogProcess {
  id: string
  catId: string | number
  icon: string
  group: 'primary' | 'support' | 'manage' | 'regulated'
  nameDE: string
  nameEN: string
  intro: string
  introEN: string
  cosmo?: boolean
  areas: CatalogArea[]
}

export interface Archetype {
  id: string
  icon: string
  label: string
  labelEN: string
  desc: string
  descEN: string
  /** relevante Prozess-IDs (null = alle) */
  procs: string[] | null
}

export interface Industry {
  id: string
  label: string
  labelEN: string
  /** Overlay: Prozesse, die in dieser Branche zusätzlich hervorgehoben/aktiviert werden */
  overlay: string[]
  /** zugeordneter Branchen-Archetyp (steuert die Scope-Vorbelegung im Interessenten-Register) */
  archetypeId?: string
  /** true = benutzerdefinierte Branche (unter Parameter gepflegt) */
  custom?: boolean
}

/* ---------- Interessent ---------- */

export interface Prospect {
  company: string
  contact: string
  industryId: string
  archetypeId: string
  size: string
  country: string
  projectStart: string
  goLive: string
  notes: string
}

/* ---------- Scoping / Feature-Bewertung ---------- */

export type PhaseEffort = Record<PhaseKey, number>

export interface FeatureState {
  scope: ScopeStatus
  /** Aufwand je Phase in Tagen */
  effort: PhaseEffort
  /** zugeordnete Produkte (Microsoft / COSMO / Third-Party) */
  products: string[]
  /** true = Standard (Fit), false = Customization (Gap) */
  standard: boolean
  /** Bemerkung / Kommentar auf Feature-Ebene */
  note?: string
}

export interface ScopeState {
  /** processId -> Scope */
  proc: Record<string, ScopeStatus>
  /** processId::areaIdx -> Scope */
  area: Record<string, ScopeStatus>
  /** processId::areaIdx::stepIdx -> FeatureState */
  feature: Record<string, FeatureState>
  /** processId -> Fit-Score (1..5) für Management Summary */
  fit: Record<string, number>
}

/* ---------- Parameter-Register ---------- */

export interface Role {
  id: string
  name: string
  /** Tagessatz in Währungseinheiten */
  rate: number
}

export type PhaseRoleMap = Record<PhaseKey, string>

export interface OverheadRole {
  id: string
  name: string
  mode: 'percent' | 'days'
  /** Prozentwert (0..100) oder feste Tage */
  value: number
  /** Tagessatz */
  rate: number
  /** nur bei länderübergreifender Implementierung (>1 Land) */
  crossCountryOnly: boolean
  active: boolean
}

export interface Parameters {
  currency: string
  hoursPerDay: number
  unit: 'days' | 'hours'
  roles: Role[]
  phaseRole: PhaseRoleMap
  overhead: OverheadRole[]
  /** benutzerdefinierte Branchen (unter Parameter gepflegt, im Interessenten-Register auswählbar) */
  customIndustries: Industry[]
  /** angepasste Prozess-Overlays für Standard-Branchen (industryId -> Prozess-IDs) */
  industryOverlays: Record<string, string[]>
}

/* ---------- Environments, Mandanten & Lizenzen ---------- */

export interface LicenseLine {
  id: string
  product: string
  unitPriceMonthly: number
  quantity: number
  /** optionaler Produkt-Code aus dem importierten Lizenzkatalog */
  code?: string
}

/** Mandant (Tenant) innerhalb eines Environments */
export interface Mandant {
  id: string
  name: string
  country: string
  currency: string
  users: number
}

export interface Environment {
  id: string
  name: string
  type: 'prod' | 'test' | 'dev'
  country: string
  currency: string
  users: number
  /** je Environment ein eigener MBPC-Workshop-Archetyp */
  archetypeId: string
  /** Mandanten (Tenants) innerhalb des Environments */
  mandanten: Mandant[]
  /** je Environment ein eigenes Scoping-Ergebnis (MBPC-Workshop) */
  scope: ScopeState
  licenses: LicenseLine[]
  /**
   * Katalogquelle des Workshops:
   * 'standard' = COSMO Standard-MBPC (statischer Seed),
   * 'mbpc' = importierter Microsoft Business Process Catalog (workload-orientiert).
   */
  catalogSource?: 'standard' | 'mbpc'
  /** bei catalogSource==='mbpc': ausgewählte Workloads (Produkt-IDs) für die Digitalisierung */
  workloads?: string[]
}

/* ---------- Importierter Lizenzkatalog ---------- */

export interface LicenseCatalogItem {
  code: string
  description: string
  vendor: string
  chargeType: string
  unit: string
  price: number
  /** auf Monatspreis normalisiert (Annual / 12) */
  monthlyPrice: number
  priceGroup: string
  /** true = COSMO-Asset (COSMO-App/-Produkt, z. B. via Cosmo Parrot/Cosma auffindbar) */
  cosmo?: boolean
}

export interface LicenseCatalog {
  items: LicenseCatalogItem[]
  importedAt: string
  fileName: string
  /** Anzahl der Zeilen in der Quelldatei (vor SaaS-Filter) */
  scannedCount?: number
}

/* ---------- Gesamter Projekt-State ---------- */

export interface ProjectState {
  prospect: Prospect
  parameters: Parameters
  environments: Environment[]
  /** aktuell im Workshop bearbeitetes Environment */
  activeEnvironmentId: string
  /** Betrachtungszeitraum in Monaten für die Gesamtkostenrechnung */
  periodMonths: number
  updatedAt: string
}

/* ---------- Microsoft Business Process Catalog (Workload-MBPC, importiert) ---------- */

/** Ein Workload (Produkt) aus dem Microsoft Business Process Catalog, z. B. „Business Central", „Field Service", „Power BI". */
export interface MbpcWorkload {
  /** slug-ID (z. B. 'field-service') */
  id: string
  /** Anzeigename (z. B. 'Field Service') */
  label: string
  /** Anwendungsfamilie (z. B. 'Customer Engagement') */
  family: string
  /** Anzahl der Prozesse, in denen der Workload vorkommt */
  count: number
}

/** Prozess (Title 4) – unterste Ebene, mit zugeordneten Workloads. */
export interface MbpcStep {
  title: string
  workloads: string[]
}

/** Prozessbereich (Title 3). */
export interface MbpcArea {
  title: string
  steps: MbpcStep[]
}

/** End-to-End-Prozess (Title 2). */
export interface MbpcProcess {
  id: string
  title: string
  icon: string
  /** aggregierte Workloads über alle enthaltenen Prozesse */
  workloads: string[]
  areas: MbpcArea[]
}

/** Importierter Microsoft Business Process Catalog (workload-orientiert). */
export interface MbpcCatalog {
  processes: MbpcProcess[]
  /** verfügbare Workloads (Produkte) zur Mehrfachauswahl */
  workloads: MbpcWorkload[]
  /** Anwendungsfamilien in bevorzugter Reihenfolge */
  families: string[]
  importedAt: string
  fileName: string
  processCount: number
  areaCount: number
  stepCount: number
}

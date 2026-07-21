import { archetypeById, areaKey, featureKey } from './catalog'
import type {
  Complexity,
  Environment,
  FeatureState,
  Mandant,
  Parameters,
  PhaseEffort,
  ProjectState,
  ScopeState,
} from '../types'

let idSeq = 0
const uid = (p: string) => `${p}-${(idSeq++).toString(36)}${Date.now().toString(36).slice(-3)}`
export { uid }

const emptyEffort = (): PhaseEffort => ({
  strategize: 0,
  initiate: 0,
  build: 0,
  prepare: 0,
  operate: 0,
})

/**
 * Standard-Aufwandsvorlage je Feature (SbD-Phasen, in Personentagen).
 * Als Default hinterlegt: wird beim Aufnehmen eines Features in den Scope
 * verwendet, solange noch kein individueller Aufwand erfasst wurde.
 * Summe = 3,0 PT (typisches Standard-Feature / Fit).
 */
export const DEFAULT_FEATURE_EFFORT: PhaseEffort = {
  strategize: 0.25,
  initiate: 0.5,
  build: 1.5,
  prepare: 0.5,
  operate: 0.25,
}

/**
 * Erfahrungsbasierte Aufwands-Vorlagen je Komplexität (T-Shirt-Größen).
 * Auf Basis des Standard-MBPC und der Success-by-Design-Phasen abgeleitet
 * (Strategize · Initiate & Scoping · Build & Implement · Prepare · Operate).
 *
 *   small   – einfaches Standard-Feature (reiner Fit, Konfiguration)  Σ 1,5 PT
 *   medium  – Standard-Feature mit Anpassung/Setup                    Σ 3,0 PT
 *   complex – Erweiterung/Customization (Gap, Entwicklung)            Σ 6,5 PT
 */
export const COMPLEXITY_EFFORT: Record<Complexity, PhaseEffort> = {
  small: { strategize: 0.25, initiate: 0.25, build: 0.5, prepare: 0.25, operate: 0.25 },
  medium: { strategize: 0.25, initiate: 0.5, build: 1.5, prepare: 0.5, operate: 0.25 },
  complex: { strategize: 0.5, initiate: 1, build: 3.5, prepare: 1, operate: 0.5 },
}

/** Erzeugt eine Kopie der Aufwands-Vorlage für eine Komplexität. */
export const effortForComplexity = (c: Complexity): PhaseEffort => ({ ...COMPLEXITY_EFFORT[c] })

/** Erzeugt eine Kopie der Standard-Aufwandsvorlage. */
export const defaultFeatureEffort = (): PhaseEffort => ({ ...DEFAULT_FEATURE_EFFORT })

/** true, wenn ein PhaseEffort keinerlei Aufwand enthält (Summe 0). */
export function isEffortEmpty(e: PhaseEffort): boolean {
  return e.strategize + e.initiate + e.build + e.prepare + e.operate === 0
}

function feature(
  effort: Partial<PhaseEffort>,
  products: string[] = [],
  standard = true,
): FeatureState {
  return {
    scope: 'in',
    effort: { ...emptyEffort(), ...effort },
    products,
    standard,
  }
}

/* ---------- Parameter-Register (Standard-Sätze) ---------- */
export function defaultParameters(): Parameters {
  return {
    currency: 'EUR',
    hoursPerDay: 8,
    unit: 'days',
    roles: [
      { id: 'consultant', name: 'Consultant', rate: 1200 },
      { id: 'senior', name: 'Senior Consultant', rate: 1500 },
      { id: 'developer', name: 'Entwickler', rate: 1300 },
      { id: 'pm', name: 'Projektleiter', rate: 1400 },
      { id: 'sa', name: 'Solution Architect', rate: 1700 },
      { id: 'swa', name: 'Software Architect', rate: 1600 },
      { id: 'progmgr', name: 'Programm-Manager', rate: 1800 },
    ],
    phaseRole: {
      strategize: 'sa',
      initiate: 'senior',
      build: 'consultant',
      prepare: 'consultant',
      operate: 'consultant',
    },
    overhead: [
      { id: 'oh-pm', name: 'Projektleiter', mode: 'percent', value: 15, rate: 1400, crossCountryOnly: false, active: true },
      { id: 'oh-sa', name: 'Solution Architect', mode: 'percent', value: 8, rate: 1700, crossCountryOnly: false, active: true },
      { id: 'oh-swa', name: 'Software Architect', mode: 'percent', value: 5, rate: 1600, crossCountryOnly: false, active: true },
      { id: 'oh-pgm', name: 'Programm-Manager (länderübergreifend)', mode: 'percent', value: 6, rate: 1800, crossCountryOnly: true, active: true },
    ],
    customIndustries: [],
    industryOverlays: {},
  }
}

/* ---------- Leeres Scoping ---------- */
export function emptyScope(): ScopeState {
  return { proc: {}, area: {}, feature: {}, fit: {} }
}

/* ---------- Pharma-Beispiel-Scoping ---------- */
function pharmaScope(): ScopeState {
  const arch = archetypeById('process')
  const relevant = arch.procs || []
  const proc: ScopeState['proc'] = {}
  relevant.forEach((id) => (proc[id] = 'in'))

  const fit: ScopeState['fit'] = {
    'quality-to-compliance': 4,
    'plan-to-produce': 3,
    'inventory-to-deliver': 4,
    'source-to-pay': 5,
    'record-to-report': 5,
    'order-to-cash': 4,
  }

  const area: ScopeState['area'] = {}
  const feat: ScopeState['feature'] = {}

  // Qualität & Compliance (COSMO-Kern der Pharma-Branche)
  area[areaKey('quality-to-compliance', 0)] = 'in'
  feat[featureKey('quality-to-compliance', 0, 0)] = feature({ strategize: 0.5, initiate: 1.5, build: 3, prepare: 1, operate: 0.5 }, ['cosmo-qmp', 'bc-premium'], true)
  feat[featureKey('quality-to-compliance', 0, 2)] = feature({ initiate: 1, build: 2.5, prepare: 0.5 }, ['cosmo-qmp'], true)
  feat[featureKey('quality-to-compliance', 1, 1)] = feature({ initiate: 1, build: 2, prepare: 0.5 }, ['cosmo-am', 'cosmo-qmp'], true)
  feat[featureKey('quality-to-compliance', 2, 0)] = feature({ strategize: 0.5, initiate: 1, build: 3, prepare: 1 }, ['cosmo-am'], true)
  feat[featureKey('quality-to-compliance', 2, 1)] = feature({ initiate: 1, build: 2.5, prepare: 0.5 }, ['cosmo-am'], false)
  feat[featureKey('quality-to-compliance', 3, 3)] = feature({ initiate: 1.5, build: 4, prepare: 1, operate: 0.5 }, ['cosmo-qmp', 'webcon'], false)
  feat[featureKey('quality-to-compliance', 5, 1)] = feature({ initiate: 1, build: 3, prepare: 1 }, ['cosmo-ls', 'webcon'], true)
  feat[featureKey('quality-to-compliance', 5, 2)] = feature({ build: 2, prepare: 0.5 }, ['cosmo-ls'], true)
  feat[featureKey('quality-to-compliance', 6, 3)] = feature({ strategize: 0.5, initiate: 1, build: 2.5 }, ['cosmo-reg'], false)
  feat[featureKey('quality-to-compliance', 7, 3)] = feature({ initiate: 1, build: 3, prepare: 1 }, ['cosmo-ls'], true)

  // Planen bis Produzieren
  feat[featureKey('plan-to-produce', 0, 1)] = feature({ initiate: 1, build: 2, prepare: 0.5 }, ['bc-premium'], true)
  feat[featureKey('plan-to-produce', 1, 1)] = feature({ initiate: 1, build: 3, prepare: 0.5 }, ['bc-premium', 'cosmo-am'], true)
  feat[featureKey('plan-to-produce', 2, 2)] = feature({ build: 2 }, ['bc-premium'], true)
  feat[featureKey('plan-to-produce', 3, 1)] = feature({ initiate: 0.5, build: 2, prepare: 0.5 }, ['cosmo-am', 'cosmo-qmp'], true)

  // Bestand bis Auslieferung
  feat[featureKey('inventory-to-deliver', 1, 3)] = feature({ initiate: 0.5, build: 1.5 }, ['bc'], true)
  feat[featureKey('inventory-to-deliver', 4, 1)] = feature({ build: 1.5, prepare: 0.5 }, ['cosmo-qmp'], true)

  // Beschaffung bis Zahlung
  feat[featureKey('source-to-pay', 3, 3)] = feature({ initiate: 0.5, build: 1.5 }, ['bc', 'continia'], true)
  feat[featureKey('source-to-pay', 4, 1)] = feature({ build: 1, prepare: 0.5 }, ['continia'], true)

  // Erfassen bis Berichten
  feat[featureKey('record-to-report', 0, 1)] = feature({ initiate: 0.5, build: 1.5 }, ['bc'], true)
  feat[featureKey('record-to-report', 5, 0)] = feature({ build: 1.5 }, ['bc', 'power-bi'], true)

  // Auftrag bis Zahlung
  feat[featureKey('order-to-cash', 1, 0)] = feature({ initiate: 0.5, build: 1.5 }, ['bc'], true)
  feat[featureKey('order-to-cash', 2, 1)] = feature({ build: 1 }, ['bc', 'continia'], true)

  return { proc, area, feature: feat, fit }
}

/* ---------- Schweiz-Rollout-Scoping (Template-Wiederverwendung, geringerer Aufwand) ---------- */
function chScope(): ScopeState {
  const arch = archetypeById('process')
  const relevant = arch.procs || []
  const proc: ScopeState['proc'] = {}
  relevant.forEach((id) => (proc[id] = 'in'))

  const fit: ScopeState['fit'] = {
    'quality-to-compliance': 5,
    'plan-to-produce': 4,
    'inventory-to-deliver': 4,
    'source-to-pay': 5,
    'record-to-report': 5,
    'order-to-cash': 5,
  }

  const feat: ScopeState['feature'] = {}
  // Template-Rollout: reduzierte Build-Aufwände dank Nachnutzung des DE-Templates
  feat[featureKey('quality-to-compliance', 0, 0)] = feature({ initiate: 0.5, build: 1, prepare: 0.5 }, ['cosmo-qmp', 'bc-premium'], true)
  feat[featureKey('quality-to-compliance', 2, 0)] = feature({ initiate: 0.5, build: 1, prepare: 0.5 }, ['cosmo-am'], true)
  feat[featureKey('quality-to-compliance', 5, 1)] = feature({ build: 1, prepare: 0.5 }, ['cosmo-ls', 'webcon'], true)
  feat[featureKey('plan-to-produce', 1, 1)] = feature({ build: 1, prepare: 0.5 }, ['bc-premium', 'cosmo-am'], true)
  feat[featureKey('source-to-pay', 3, 3)] = feature({ build: 0.5 }, ['bc', 'continia'], true)
  feat[featureKey('record-to-report', 5, 0)] = feature({ build: 0.5 }, ['bc', 'power-bi'], true)
  feat[featureKey('order-to-cash', 1, 0)] = feature({ build: 0.5 }, ['bc'], true)

  return { proc, area: {}, feature: feat, fit }
}

function pharmaEnvironments(): Environment[] {
  return [
    {
      id: uid('env'),
      name: 'Produktiv Deutschland',
      type: 'prod',
      country: 'DE',
      currency: 'EUR',
      users: 60,
      archetypeId: 'process',
      mandanten: [
        { id: uid('md'), name: 'NovaPharm Solutions GmbH', country: 'DE', currency: 'EUR', users: 45 },
        { id: uid('md'), name: 'NovaPharm Logistik GmbH', country: 'DE', currency: 'EUR', users: 15 },
      ],
      scope: pharmaScope(),
      licenses: [
        { id: uid('lic'), product: 'Business Central Premium', unitPriceMonthly: 91, quantity: 45 },
        { id: uid('lic'), product: 'Business Central Team Member', unitPriceMonthly: 7.5, quantity: 15 },
        { id: uid('lic'), product: 'COSMO Advanced Manufacturing Pack', unitPriceMonthly: 22, quantity: 45 },
        { id: uid('lic'), product: 'COSMO Quality Management Pack', unitPriceMonthly: 18, quantity: 45 },
        { id: uid('lic'), product: 'COSMO Life Science Pack', unitPriceMonthly: 20, quantity: 45 },
        { id: uid('lic'), product: 'Continia Document Capture', unitPriceMonthly: 9, quantity: 25 },
      ],
    },
    {
      id: uid('env'),
      name: 'Produktiv Schweiz',
      type: 'prod',
      country: 'CH',
      currency: 'EUR',
      users: 25,
      archetypeId: 'process',
      mandanten: [
        { id: uid('md'), name: 'NovaPharm Suisse SA', country: 'CH', currency: 'EUR', users: 25 },
      ],
      scope: chScope(),
      licenses: [
        { id: uid('lic'), product: 'Business Central Premium', unitPriceMonthly: 91, quantity: 18 },
        { id: uid('lic'), product: 'Business Central Team Member', unitPriceMonthly: 7.5, quantity: 7 },
        { id: uid('lic'), product: 'COSMO Advanced Manufacturing Pack', unitPriceMonthly: 22, quantity: 18 },
        { id: uid('lic'), product: 'COSMO Quality Management Pack', unitPriceMonthly: 18, quantity: 18 },
      ],
    },
  ]
}

/* ---------- Neues (leeres) Environment ---------- */
export function newEnvironment(name: string, archetypeId = 'all', country = 'DE'): Environment {
  return {
    id: uid('env'),
    name,
    type: 'prod',
    country,
    currency: 'EUR',
    users: 0,
    archetypeId,
    mandanten: [],
    scope: emptyScope(),
    licenses: [],
    catalogSource: 'standard',
    workloads: [],
  }
}

/* ---------- Neuer Mandant ---------- */
export function newMandant(country = 'DE'): Mandant {
  return { id: uid('md'), name: '', country, currency: 'EUR', users: 0 }
}

/* ---------- Leerer Projekt-State ---------- */
export function emptyProject(): ProjectState {
  const env = newEnvironment('Produktiv', 'all', 'DE')
  return {
    prospect: {
      company: '',
      contact: '',
      industryId: 'pharma',
      archetypeId: 'all',
      size: '',
      country: 'DE',
      projectStart: '',
      goLive: '',
      notes: '',
    },
    parameters: defaultParameters(),
    environments: [env],
    activeEnvironmentId: env.id,
    periodMonths: 36,
    updatedAt: new Date().toISOString(),
  }
}

/* ---------- Vollständiges Pharma-Beispiel ---------- */
export function pharmaExample(): ProjectState {
  const environments = pharmaEnvironments()
  return {
    prospect: {
      company: 'NovaPharm Solutions GmbH',
      contact: 'Dr. Katharina Berger (Head of Operations)',
      industryId: 'pharma',
      archetypeId: 'process',
      size: '250–500 Mitarbeitende',
      country: 'DE',
      projectStart: '2026-09-01',
      goLive: '2027-06-01',
      notes: 'GMP-regulierter Prozessfertiger für feste und flüssige Darreichungsformen. Standorte in Deutschland und der Schweiz – länderübergreifender Rollout mit einheitlichem Template.',
    },
    parameters: defaultParameters(),
    environments,
    activeEnvironmentId: environments[0].id,
    periodMonths: 36,
    updatedAt: new Date().toISOString(),
  }
}

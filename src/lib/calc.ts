import { areaKey, featureKey } from '../data/catalog'
import { catalogForEnvironment } from './mbpcCatalog'
import type {
  CatalogProcess,
  Complexity,
  Environment,
  Parameters,
  PhaseKey,
  ProjectState,
  ScopeState,
  ScopeStatus,
} from '../types'
import { CALC_PHASE_KEYS } from '../types'

/** Effektiver Scope eines Features (Feature > Area > Prozess > unset) */
export function effectiveFeatureScope(
  scope: ScopeState,
  processId: string,
  areaIdx: number,
  stepIdx: number,
): ScopeStatus {
  const f = scope.feature[featureKey(processId, areaIdx, stepIdx)]
  if (f && f.scope !== 'unset') return f.scope
  const a = scope.area[areaKey(processId, areaIdx)]
  if (a && a !== 'unset') return a
  const p = scope.proc[processId]
  if (p && p !== 'unset') return p
  return 'unset'
}

export interface FeatureCalc {
  processId: string
  areaIdx: number
  stepIdx: number
  label: string
  scope: ScopeStatus
  days: number
  cost: number
  standard: boolean
  phaseDays: Record<PhaseKey, number>
}

export interface ScopeStats {
  in: number
  opt: number
  out: number
  unset: number
  total: number
}

/** Reines Scoping-Ergebnis (ohne Overhead/Lizenzen) für einen Workshop */
export interface ScopeCalc {
  features: FeatureCalc[]
  featureDays: number
  featureCost: number
  phaseDays: Record<PhaseKey, number>
  phaseCost: Record<PhaseKey, number>
  /** optionale (opt) Positionen – separat ausgewiesen, nicht in features/featureCost enthalten */
  optFeatures: FeatureCalc[]
  optFeatureDays: number
  optFeatureCost: number
  optPhaseDays: Record<PhaseKey, number>
  optPhaseCost: Record<PhaseKey, number>
  scopeStats: ScopeStats
  standardCount: number
  customCount: number
}

export interface CalcResult {
  /** in Scope befindliche Features mit Kosten (über alle Environments) */
  features: FeatureCalc[]
  featureDays: number
  featureCost: number
  phaseDays: Record<PhaseKey, number>
  phaseCost: Record<PhaseKey, number>
  /** optionale (opt) Positionen – separat ausgewiesen, nicht in Dienstleistung/Investition enthalten */
  optFeatures: FeatureCalc[]
  optFeatureDays: number
  optFeatureCost: number
  optPhaseDays: Record<PhaseKey, number>
  optPhaseCost: Record<PhaseKey, number>
  overheadDays: number
  overheadCost: number
  overheadLines: { name: string; days: number; cost: number; applied: boolean; reason?: string }[]
  crossServiceDays: number
  crossServiceCost: number
  crossServiceLines: { name: string; days: number; rate: number; cost: number; applied: boolean }[]
  /** Schnittstellen (in Scope) – Aufwand ausschließlich in Initiate & Scoping */
  interfaceLines: InterfaceCalc[]
  interfaceDays: number
  interfaceCost: number
  /** optionale Schnittstellen – separat ausgewiesen, nicht in der Dienstleistung enthalten */
  optInterfaceLines: InterfaceCalc[]
  optInterfaceDays: number
  optInterfaceCost: number
  /** Tagessatz der Initiate-&-Scoping-Rolle */
  interfaceRate: number
  serviceDays: number
  serviceCostOneTime: number
  // Lizenzen
  licenseMonthly: number
  licenseYearly: number
  licensePeriod: number
  /** optionale Lizenzen (über alle Environments) – separat ausgewiesen, nicht in totalPeriod */
  optionalLicenseMonthly: number
  optionalLicenseYearly: number
  optionalLicensePeriod: number
  perEnvironment: EnvironmentCalc[]
  // Gesamt
  periodMonths: number
  totalPeriod: number
  totalMonthlyRunRate: number
  // Scope-Statistik (aggregiert)
  scopeStats: ScopeStats
  distinctCountries: number
  standardCount: number
  customCount: number
}

export interface InterfaceCalc {
  id: string
  name: string
  source: string
  target: string
  platform: string
  days: number
  cost: number
}

export interface EnvironmentCalc {
  id: string
  name: string
  country: string
  users: number
  /** Scoping-Ergebnis des Environment-Workshops */
  scope: ScopeCalc
  serviceDays: number
  serviceCostOneTime: number
  licenseMonthly: number
  licenseYearly: number
  licensePeriod: number
  /** optionale Lizenzen – separat ausgewiesen, nicht in totalPeriod enthalten */
  optionalLicenseMonthly: number
  optionalLicenseYearly: number
  optionalLicensePeriod: number
  /** Dienstleistung (einmalig) + Lizenzen (Periode) – ohne Projekt-Overhead */
  totalPeriod: number
}

function roleRate(params: Parameters, roleId: string): number {
  return params.roles.find((r) => r.id === roleId)?.rate ?? 0
}

function emptyPhaseRecord(): Record<PhaseKey, number> {
  return { strategize: 0, initiate: 0, build: 0, prepare: 0, operate: 0 }
}

/** Faktor aus dem globalen Komplexitäts-Regler; Features ohne Vorlage bleiben unverändert. */
export function complexityFactor(params: Parameters, complexity: Complexity | undefined): number {
  if (!complexity) return 1
  const pct = params.complexityAdjust?.[complexity] ?? 0
  return Math.max(0, 1 + pct / 100)
}

/** Berechnet ein einzelnes Scoping (ein Workshop) */
export function calcScope(scope: ScopeState, params: Parameters, catalog: CatalogProcess[]): ScopeCalc {
  const features: FeatureCalc[] = []
  const phaseDays = emptyPhaseRecord()
  const phaseCost = emptyPhaseRecord()
  const optFeatures: FeatureCalc[] = []
  const optPhaseDays = emptyPhaseRecord()
  const optPhaseCost = emptyPhaseRecord()
  const scopeStats: ScopeStats = { in: 0, opt: 0, out: 0, unset: 0, total: 0 }
  let standardCount = 0
  let customCount = 0

  for (const proc of catalog) {
    proc.areas.forEach((area, areaIdx) => {
      area.steps.forEach((label, stepIdx) => {
        scopeStats.total++
        const eff = effectiveFeatureScope(scope, proc.id, areaIdx, stepIdx)
        if (eff === 'in') scopeStats.in++
        else if (eff === 'opt') scopeStats.opt++
        else if (eff === 'out') scopeStats.out++
        else scopeStats.unset++

        const fs = scope.feature[featureKey(proc.id, areaIdx, stepIdx)]
        if (!fs) return
        if (eff !== 'in' && eff !== 'opt') return

        const isOpt = eff === 'opt'
        const pd = emptyPhaseRecord()
        const adj = complexityFactor(params, fs.complexity)
        let days = 0
        let cost = 0
        for (const phase of CALC_PHASE_KEYS) {
          const d = (fs.effort[phase] || 0) * adj
          if (d <= 0) continue
          const rate = roleRate(params, params.phaseRole[phase])
          pd[phase] = d
          days += d
          cost += d * rate
          if (isOpt) {
            optPhaseDays[phase] += d
            optPhaseCost[phase] += d * rate
          } else {
            phaseDays[phase] += d
            phaseCost[phase] += d * rate
          }
        }
        // In-Scope-Positionen ohne Aufwand werden nicht gezählt; optionale Positionen
        // werden dagegen immer gelistet (auch ohne Schätzung), damit sie sichtbar bleiben.
        if (days <= 0 && !isOpt) return
        const featureCalc: FeatureCalc = {
          processId: proc.id,
          areaIdx,
          stepIdx,
          label,
          scope: eff,
          days,
          cost,
          standard: fs.standard,
          phaseDays: pd,
        }
        if (isOpt) {
          optFeatures.push(featureCalc)
        } else {
          if (fs.standard) standardCount++
          else customCount++
          features.push(featureCalc)
        }
      })
    })
  }

  const featureDays = CALC_PHASE_KEYS.reduce((s, p) => s + phaseDays[p], 0)
  const featureCost = CALC_PHASE_KEYS.reduce((s, p) => s + phaseCost[p], 0)
  const optFeatureDays = CALC_PHASE_KEYS.reduce((s, p) => s + optPhaseDays[p], 0)
  const optFeatureCost = CALC_PHASE_KEYS.reduce((s, p) => s + optPhaseCost[p], 0)

  return {
    features,
    featureDays,
    featureCost,
    phaseDays,
    phaseCost,
    optFeatures,
    optFeatureDays,
    optFeatureCost,
    optPhaseDays,
    optPhaseCost,
    scopeStats,
    standardCount,
    customCount,
  }
}

export function calcEnvironment(env: Environment, params: Parameters, periodMonths: number): EnvironmentCalc {
  const scope = calcScope(env.scope, params, catalogForEnvironment(env))
  const monthly = env.licenses.reduce((sum, l) => sum + l.unitPriceMonthly * l.quantity, 0)
  const licensePeriod = monthly * periodMonths
  const optMonthly = (env.optionalLicenses ?? []).reduce((sum, l) => sum + l.unitPriceMonthly * l.quantity, 0)
  return {
    id: env.id,
    name: env.name,
    country: env.country,
    users: env.users,
    scope,
    serviceDays: scope.featureDays,
    serviceCostOneTime: scope.featureCost,
    licenseMonthly: monthly,
    licenseYearly: monthly * 12,
    licensePeriod,
    optionalLicenseMonthly: optMonthly,
    optionalLicenseYearly: optMonthly * 12,
    optionalLicensePeriod: optMonthly * periodMonths,
    totalPeriod: scope.featureCost + licensePeriod,
  }
}

/** Ermittelt das aktuell aktive Environment (mit Fallback auf das erste) */
export function activeEnvironment(state: ProjectState): Environment | undefined {
  return (
    state.environments.find((e) => e.id === state.activeEnvironmentId) ||
    state.environments[0]
  )
}

export function calculate(state: ProjectState): CalcResult {
  const { parameters: params, environments, periodMonths } = state

  const perEnvironment = environments.map((e) => calcEnvironment(e, params, periodMonths))

  // Aggregierte Feature-/Phasenwerte über alle Environments
  const features: FeatureCalc[] = []
  const phaseDays = emptyPhaseRecord()
  const phaseCost = emptyPhaseRecord()
  const optFeatures: FeatureCalc[] = []
  const optPhaseDays = emptyPhaseRecord()
  const optPhaseCost = emptyPhaseRecord()
  const scopeStats: ScopeStats = { in: 0, opt: 0, out: 0, unset: 0, total: 0 }
  let standardCount = 0
  let customCount = 0
  for (const ec of perEnvironment) {
    features.push(...ec.scope.features)
    optFeatures.push(...ec.scope.optFeatures)
    for (const p of CALC_PHASE_KEYS) {
      phaseDays[p] += ec.scope.phaseDays[p]
      phaseCost[p] += ec.scope.phaseCost[p]
      optPhaseDays[p] += ec.scope.optPhaseDays[p]
      optPhaseCost[p] += ec.scope.optPhaseCost[p]
    }
    scopeStats.in += ec.scope.scopeStats.in
    scopeStats.opt += ec.scope.scopeStats.opt
    scopeStats.out += ec.scope.scopeStats.out
    scopeStats.unset += ec.scope.scopeStats.unset
    scopeStats.total += ec.scope.scopeStats.total
    standardCount += ec.scope.standardCount
    customCount += ec.scope.customCount
  }

  const featureDays = CALC_PHASE_KEYS.reduce((s, p) => s + phaseDays[p], 0)
  const featureCost = CALC_PHASE_KEYS.reduce((s, p) => s + phaseCost[p], 0)
  const optFeatureDays = CALC_PHASE_KEYS.reduce((s, p) => s + optPhaseDays[p], 0)
  const optFeatureCost = CALC_PHASE_KEYS.reduce((s, p) => s + optPhaseCost[p], 0)

  // Länder / länderübergreifend
  const distinctCountries = new Set(environments.map((e) => e.country).filter(Boolean)).size
  const crossCountry = distinctCountries > 1

  // Overhead (Projektebene, auf aggregierte Feature-Tage)
  const overheadLines: CalcResult['overheadLines'] = []
  let overheadDays = 0
  let overheadCost = 0
  for (const oh of params.overhead) {
    const applied = oh.active && (!oh.crossCountryOnly || crossCountry)
    let days = 0
    let cost = 0
    if (applied) {
      days = oh.mode === 'percent' ? (oh.value / 100) * featureDays : oh.value
      cost = days * oh.rate
      overheadDays += days
      overheadCost += cost
    }
    overheadLines.push({
      name: oh.name,
      days,
      cost,
      applied,
      reason: oh.crossCountryOnly && !crossCountry ? 'nur bei >1 Land' : undefined,
    })
  }

  // Bereichsübergreifende Dienstleistungen (Projektebene, PT × Dienstleistungsrolle)
  const crossServiceLines: CalcResult['crossServiceLines'] = []
  let crossServiceDays = 0
  let crossServiceCost = 0
  for (const cs of params.crossServices ?? []) {
    const rate = roleRate(params, cs.roleId)
    const days = cs.active ? cs.days || 0 : 0
    const cost = days * rate
    if (cs.active) {
      crossServiceDays += days
      crossServiceCost += cost
    }
    crossServiceLines.push({ name: cs.name, days, rate, cost, applied: cs.active })
  }

  // Schnittstellen (Projektebene) – nur Initiate & Scoping, Tagessatz der Initiate-Rolle
  const interfaceRate = roleRate(params, params.phaseRole.initiate)
  const interfaceLines: InterfaceCalc[] = []
  const optInterfaceLines: InterfaceCalc[] = []
  for (const it of state.interfaces ?? []) {
    if (it.scope !== 'in' && it.scope !== 'opt') continue
    const days = Math.max(0, it.days || 0)
    const line: InterfaceCalc = {
      id: it.id,
      name: it.name,
      source: it.source,
      target: it.target,
      platform: it.platform,
      days,
      cost: days * interfaceRate,
    }
    ;(it.scope === 'in' ? interfaceLines : optInterfaceLines).push(line)
  }
  const interfaceDays = interfaceLines.reduce((s, l) => s + l.days, 0)
  const interfaceCost = interfaceLines.reduce((s, l) => s + l.cost, 0)
  const optInterfaceDays = optInterfaceLines.reduce((s, l) => s + l.days, 0)
  const optInterfaceCost = optInterfaceLines.reduce((s, l) => s + l.cost, 0)

  const serviceDays = featureDays + overheadDays + crossServiceDays + interfaceDays
  const serviceCostOneTime = featureCost + overheadCost + crossServiceCost + interfaceCost

  // Lizenzen
  const licenseMonthly = perEnvironment.reduce((s, e) => s + e.licenseMonthly, 0)
  const licenseYearly = licenseMonthly * 12
  const licensePeriod = licenseMonthly * periodMonths
  const optionalLicenseMonthly = perEnvironment.reduce((s, e) => s + e.optionalLicenseMonthly, 0)
  const optionalLicenseYearly = optionalLicenseMonthly * 12
  const optionalLicensePeriod = optionalLicenseMonthly * periodMonths

  const totalPeriod = serviceCostOneTime + licensePeriod
  const totalMonthlyRunRate = licenseMonthly

  return {
    features,
    featureDays,
    featureCost,
    phaseDays,
    phaseCost,
    optFeatures,
    optFeatureDays,
    optFeatureCost,
    optPhaseDays,
    optPhaseCost,
    overheadDays,
    overheadCost,
    overheadLines,
    crossServiceDays,
    crossServiceCost,
    crossServiceLines,
    interfaceLines,
    interfaceDays,
    interfaceCost,
    optInterfaceLines,
    optInterfaceDays,
    optInterfaceCost,
    interfaceRate,
    serviceDays,
    serviceCostOneTime,
    licenseMonthly,
    licenseYearly,
    licensePeriod,
    optionalLicenseMonthly,
    optionalLicenseYearly,
    optionalLicensePeriod,
    perEnvironment,
    periodMonths,
    totalPeriod,
    totalMonthlyRunRate,
    scopeStats,
    distinctCountries,
    standardCount,
    customCount,
  }
}

/* ---------- Formatierungshelfer ---------- */
export function formatCurrency(value: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value || 0)
}

export function formatDays(value: number): string {
  return new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 }).format(value || 0)
}

export function formatNumber(value: number, digits = 0): string {
  return new Intl.NumberFormat('de-DE', { maximumFractionDigits: digits }).format(value || 0)
}

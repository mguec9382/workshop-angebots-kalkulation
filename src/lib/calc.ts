import { areaKey, featureKey } from '../data/catalog'
import { catalogForEnvironment } from './mbpcCatalog'
import type {
  CatalogProcess,
  Environment,
  Parameters,
  PhaseKey,
  ProjectState,
  ScopeState,
  ScopeStatus,
} from '../types'
import { PHASE_KEYS } from '../types'

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
  overheadDays: number
  overheadCost: number
  overheadLines: { name: string; days: number; cost: number; applied: boolean; reason?: string }[]
  serviceDays: number
  serviceCostOneTime: number
  // Lizenzen
  licenseMonthly: number
  licenseYearly: number
  licensePeriod: number
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
  /** Dienstleistung (einmalig) + Lizenzen (Periode) – ohne Projekt-Overhead */
  totalPeriod: number
}

function roleRate(params: Parameters, roleId: string): number {
  return params.roles.find((r) => r.id === roleId)?.rate ?? 0
}

function emptyPhaseRecord(): Record<PhaseKey, number> {
  return { strategize: 0, initiate: 0, build: 0, prepare: 0, operate: 0 }
}

/** Berechnet ein einzelnes Scoping (ein Workshop) */
export function calcScope(scope: ScopeState, params: Parameters, catalog: CatalogProcess[]): ScopeCalc {
  const features: FeatureCalc[] = []
  const phaseDays = emptyPhaseRecord()
  const phaseCost = emptyPhaseRecord()
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
        if (eff !== 'in') return

        const pd = emptyPhaseRecord()
        let days = 0
        let cost = 0
        for (const phase of PHASE_KEYS) {
          const d = fs.effort[phase] || 0
          if (d <= 0) continue
          const rate = roleRate(params, params.phaseRole[phase])
          pd[phase] = d
          phaseDays[phase] += d
          phaseCost[phase] += d * rate
          days += d
          cost += d * rate
        }
        if (days <= 0) return
        if (fs.standard) standardCount++
        else customCount++
        features.push({
          processId: proc.id,
          areaIdx,
          stepIdx,
          label,
          scope: eff,
          days,
          cost,
          standard: fs.standard,
          phaseDays: pd,
        })
      })
    })
  }

  const featureDays = PHASE_KEYS.reduce((s, p) => s + phaseDays[p], 0)
  const featureCost = PHASE_KEYS.reduce((s, p) => s + phaseCost[p], 0)

  return { features, featureDays, featureCost, phaseDays, phaseCost, scopeStats, standardCount, customCount }
}

export function calcEnvironment(env: Environment, params: Parameters, periodMonths: number): EnvironmentCalc {
  const scope = calcScope(env.scope, params, catalogForEnvironment(env))
  const monthly = env.licenses.reduce((sum, l) => sum + l.unitPriceMonthly * l.quantity, 0)
  const licensePeriod = monthly * periodMonths
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
  const scopeStats: ScopeStats = { in: 0, opt: 0, out: 0, unset: 0, total: 0 }
  let standardCount = 0
  let customCount = 0
  for (const ec of perEnvironment) {
    features.push(...ec.scope.features)
    for (const p of PHASE_KEYS) {
      phaseDays[p] += ec.scope.phaseDays[p]
      phaseCost[p] += ec.scope.phaseCost[p]
    }
    scopeStats.in += ec.scope.scopeStats.in
    scopeStats.opt += ec.scope.scopeStats.opt
    scopeStats.out += ec.scope.scopeStats.out
    scopeStats.unset += ec.scope.scopeStats.unset
    scopeStats.total += ec.scope.scopeStats.total
    standardCount += ec.scope.standardCount
    customCount += ec.scope.customCount
  }

  const featureDays = PHASE_KEYS.reduce((s, p) => s + phaseDays[p], 0)
  const featureCost = PHASE_KEYS.reduce((s, p) => s + phaseCost[p], 0)

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

  const serviceDays = featureDays + overheadDays
  const serviceCostOneTime = featureCost + overheadCost

  // Lizenzen
  const licenseMonthly = perEnvironment.reduce((s, e) => s + e.licenseMonthly, 0)
  const licenseYearly = licenseMonthly * 12
  const licensePeriod = licenseMonthly * periodMonths

  const totalPeriod = serviceCostOneTime + licensePeriod
  const totalMonthlyRunRate = licenseMonthly

  return {
    features,
    featureDays,
    featureCost,
    phaseDays,
    phaseCost,
    overheadDays,
    overheadCost,
    overheadLines,
    serviceDays,
    serviceCostOneTime,
    licenseMonthly,
    licenseYearly,
    licensePeriod,
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

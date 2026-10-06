import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../../lib/store'
import { useLang } from '../../i18n/LanguageContext'
import { catalogsForState } from '../../lib/mbpcCatalog'
import { archetypeById, findIndustry, GROUP_LABEL, processById } from '../../data/catalog'
import { formatDays, formatNumber } from '../../lib/calc'
import { useCalc } from '../../lib/calcContext'
import { useCurrencyView } from '../../lib/currencyView'
import { CurrencyToggle } from '../CurrencyToggle'
import { InterfaceCostCard } from '../InterfaceCostCard'
import { CALC_PHASE_KEYS } from '../../types'
import type { PhaseKey } from '../../types'
import { PanelTitle } from './ProspectPanel'
import { exportVersionComparison } from '../../lib/powerbiExport'
import { exportExcelQuote } from '../../lib/excelExport'
import { idbAvailable, listVersions } from '../../lib/library'
import type { VersionMeta } from '../../lib/library'

const GOLD = '#B39C4D'
const ANTHRA = '#4b5563'

const PHASE_LABEL: Record<PhaseKey, string> = {
  strategize: 'phase_strategize',
  initiate: 'phase_initiate',
  build: 'phase_build',
  prepare: 'phase_prepare',
  operate: 'phase_operate',
}

export function DashboardPanel() {
  const { t, lang } = useLang()
  const { state, currentProjectId } = useStore()
  const view0 = useCurrencyView()
  const cur = view0.cur
  const formatCurrency = (value: number, _currency?: string) => view0.fmt(value)
  const calc = useCalc()

  // Prozess-Namensauflösung
  const procMap = useMemo(() => {
    const m = new Map(catalogsForState(state).map((p) => [p.id, p]))
    return m
  }, [state])
  const procName = (id: string): string => {
    const p = procMap.get(id) || processById(id)
    if (!p) return id
    return (lang === 'de' ? p.nameDE : p.nameEN) || p.nameDE
  }
  const procIcon = (id: string): string => (procMap.get(id) || processById(id))?.icon || '•'
  const procGroup = (id: string): string => {
    const p = procMap.get(id) || processById(id)
    return p ? GROUP_LABEL[p.group][lang] : ''
  }

  // ── Slicer (Filter) ────────────────────────────────────────────────────
  const allEnvIds = calc.perEnvironment.map((e) => e.id)
  const allCountries = Array.from(new Set(calc.perEnvironment.map((e) => e.country).filter(Boolean)))
  const [selEnv, setSelEnv] = useState<string[]>(allEnvIds)
  const [selCountry, setSelCountry] = useState<string[]>([])

  // Auswahl gültig halten, wenn sich die Environment-Liste ändert
  useEffect(() => {
    setSelEnv((prev) => {
      const valid = prev.filter((id) => allEnvIds.includes(id))
      return valid.length ? valid : allEnvIds
    })
    setSelCountry((prev) => prev.filter((c) => allCountries.includes(c)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allEnvIds.join('|'), allCountries.join('|')])

  const toggle = (arr: string[], set: (v: string[]) => void, id: string) =>
    set(arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id])

  // ── Gefilterte Sicht ───────────────────────────────────────────────────
  const view = useMemo(() => {
    const envs = calc.perEnvironment.filter(
      (e) => selEnv.includes(e.id) && (selCountry.length === 0 || selCountry.includes(e.country)),
    )
    const allSelected = envs.length === calc.perEnvironment.length && selCountry.length === 0
    const sum = (f: (e: (typeof envs)[number]) => number) => envs.reduce((s, e) => s + f(e), 0)

    const featureDays = sum((e) => e.serviceDays)
    const featureCost = sum((e) => e.serviceCostOneTime)
    const licenseMonthly = sum((e) => e.licenseMonthly)
    const licensePeriod = sum((e) => e.licensePeriod)
    const optionalLicenseMonthly = sum((e) => e.optionalLicenseMonthly)
    const optionalLicensePeriod = sum((e) => e.optionalLicensePeriod)
    const overheadDays = allSelected ? calc.overheadDays : 0
    const overheadCost = allSelected ? calc.overheadCost : 0
    const crossServiceDays = allSelected ? calc.crossServiceDays : 0
    const crossServiceCost = allSelected ? calc.crossServiceCost : 0
    // Schnittstellen liegen auf Projektebene und zählen nur in der Gesamtsicht
    const interfaceDays = allSelected ? calc.interfaceDays : 0
    const interfaceCost = allSelected ? calc.interfaceCost : 0
    const serviceDays = featureDays + overheadDays + crossServiceDays + interfaceDays
    const serviceCost = featureCost + overheadCost + crossServiceCost + interfaceCost
    const totalPeriod = serviceCost + licensePeriod

    const phaseDays: Record<PhaseKey, number> = {
      strategize: 0, initiate: 0, build: 0, prepare: 0, operate: 0,
    }
    const scope = { in: 0, opt: 0, out: 0, unset: 0, total: 0 }
    let standardCount = 0
    let customCount = 0
    const featuresByProc = new Map<string, { days: number; cost: number }>()
    // optionale (opt) Positionen separat aggregieren
    let optDays = 0
    let optCost = 0
    let optCount = 0
    const optByProc = new Map<string, { days: number; cost: number; count: number }>()
    for (const e of envs) {
      for (const k of CALC_PHASE_KEYS) phaseDays[k] += e.scope.phaseDays[k]
      scope.in += e.scope.scopeStats.in
      scope.opt += e.scope.scopeStats.opt
      scope.out += e.scope.scopeStats.out
      scope.unset += e.scope.scopeStats.unset
      scope.total += e.scope.scopeStats.total
      standardCount += e.scope.standardCount
      customCount += e.scope.customCount
      for (const f of e.scope.features) {
        const agg = featuresByProc.get(f.processId) || { days: 0, cost: 0 }
        agg.days += f.days
        agg.cost += f.cost
        featuresByProc.set(f.processId, agg)
      }
      optDays += e.scope.optFeatureDays
      optCost += e.scope.optFeatureCost
      optCount += e.scope.optFeatures.length
      for (const f of e.scope.optFeatures) {
        const agg = optByProc.get(f.processId) || { days: 0, cost: 0, count: 0 }
        agg.days += f.days
        agg.cost += f.cost
        agg.count += 1
        optByProc.set(f.processId, agg)
      }
    }
    const processes = Array.from(featuresByProc.entries())
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.days - a.days)
    const optProcesses = Array.from(optByProc.entries())
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.cost - a.cost)

    const featureCount = envs.reduce((s, e) => s + e.scope.features.length, 0)
    const fit = standardCount + customCount > 0 ? (standardCount / (standardCount + customCount)) * 100 : 0

    return {
      envs, allSelected, featureCost, licenseMonthly, licensePeriod, overheadDays, overheadCost,
      serviceDays, serviceCost, totalPeriod, phaseDays, scope, processes, featureCount, fit,
      optDays, optCost, optCount, optProcesses, interfaceDays, interfaceCost,
      optionalLicenseMonthly, optionalLicensePeriod,
    }
  }, [calc, selEnv, selCountry])

  // ── Versionen (Verlauf) ────────────────────────────────────────────────
  const [versions, setVersions] = useState<VersionMeta[]>([])
  const [showVersions, setShowVersions] = useState(true)
  useEffect(() => {
    let alive = true
    if (idbAvailable() && currentProjectId) {
      listVersions(currentProjectId).then((v) => {
        if (alive) setVersions(v)
      })
    } else {
      setVersions([])
    }
    return () => {
      alive = false
    }
  }, [currentProjectId, state])

  // ── Export ─────────────────────────────────────────────────────────────
  const [busy, setBusy] = useState(false)
  const doExport = async () => {
    setBusy(true)
    try {
      await exportExcelQuote(state, lang, { chf: view0.active, rate: view0.rate })
    } finally {
      setBusy(false)
    }
  }

  const maxEnvTotal = Math.max(1, ...view.envs.map((e) => e.serviceCostOneTime + e.licensePeriod))
  const maxPhase = Math.max(1, ...CALC_PHASE_KEYS.map((k) => view.phaseDays[k]))
  const maxProc = Math.max(1, ...view.processes.map((p) => p.days))
  const scopeTotal = Math.max(1, view.scope.total)
  const p = state.prospect

  return (
    <div className="space-y-5">
      <div className="cc-no-print flex flex-wrap items-start justify-between gap-3">
        <PanelTitle title={t('tab_dashboard')} intro={t('dash_intro')} />
        <div className="flex flex-wrap gap-2">
          <CurrencyToggle />
          <button className="cc-btn-ghost" onClick={() => window.print()}>
            🖨️ {t('dash_print')}
          </button>
          <button className="cc-btn-gold" onClick={doExport} disabled={busy}>
            📊 {busy ? t('dash_export_excel_busy') : t('dash_export_excel')}
          </button>
        </div>
      </div>

      {/* Excel-Report-Hinweis */}
      <p className="cc-no-print rounded-lg border border-cosmo-gold/40 bg-cosmo-gold/10 px-3 py-2 text-xs text-cosmo-gold-dark dark:text-amber-200">
        {t('dash_export_excel_hint')}
      </p>

      {/* Slicer */}
      <div className="cc-no-print grid gap-3 md:grid-cols-2">
        <Slicer label={t('dash_filter_env')}>
          {calc.perEnvironment.map((e) => (
            <Chip key={e.id} active={selEnv.includes(e.id)} onClick={() => toggle(selEnv, setSelEnv, e.id)}>
              {e.name}
            </Chip>
          ))}
        </Slicer>
        {allCountries.length > 1 && (
          <Slicer label={t('dash_filter_country')}>
            <Chip active={selCountry.length === 0} onClick={() => setSelCountry([])}>
              {t('dash_all')}
            </Chip>
            {allCountries.map((c) => (
              <Chip key={c} active={selCountry.includes(c)} onClick={() => toggle(selCountry, setSelCountry, c)}>
                {c}
              </Chip>
            ))}
          </Slicer>
        )}
      </div>

      {/* KPI-Kacheln */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5 xl:grid-cols-9">
        <Kpi label={t('dash_kpi_investment')} value={formatCurrency(view.totalPeriod, cur)} sub={`${calc.periodMonths} ${t('months')}`} gold />
        <Kpi label={t('dash_kpi_service_once')} value={formatCurrency(view.serviceCost, cur)} />
        <Kpi label={t('dash_kpi_license_month')} value={formatCurrency(view.licenseMonthly, cur)} />
        <Kpi label={t('tab_interfaces')} value={formatCurrency(view.interfaceCost, cur)} sub={`${calc.interfaceLines.length} · ${formatDays(view.interfaceDays)} ${t('perDay')}`} />
        <Kpi label={t('dash_kpi_effort')} value={`${formatDays(view.serviceDays)} ${t('perDay')}`} sub={`${view.featureCount} Features`} />
        <Kpi label={t('dash_kpi_period')} value={`${calc.periodMonths}`} sub={t('months')} />
        <Kpi label={t('dash_kpi_inscope')} value={formatNumber(view.scope.in)} sub={`/ ${formatNumber(view.scope.total)}`} />
        <Kpi label={t('dash_kpi_optional')} value={formatCurrency(view.optCost, cur)} sub={`${view.optCount} ${view.optCount === 1 ? t('feature_singular') : t('feature_plural')} · ${formatDays(view.optDays)} ${t('perDay')}`} />
        <Kpi label={t('dash_kpi_fit')} value={`${formatNumber(view.fit, 0)} %`} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Kosten je Environment */}
        <div className="cc-card p-5">
          <h3 className="mb-3 text-sm font-bold text-cosmo-anthracite dark:text-slate-100">{t('dash_cost_by_env')}</h3>
          <div className="mb-3 flex gap-4 text-xs text-slate-500 dark:text-slate-400">
            <Legend color={GOLD} label={t('dash_legend_service')} />
            <Legend color={ANTHRA} label={t('dash_legend_license')} />
          </div>
          <div className="space-y-3">
            {view.envs.map((e) => {
              const total = e.serviceCostOneTime + e.licensePeriod
              return (
                <div key={e.id}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="font-medium text-slate-700 dark:text-slate-200">{e.name}</span>
                    <span className="text-slate-500 dark:text-slate-400">{formatCurrency(total, cur)}</span>
                  </div>
                  <div className="flex h-4 overflow-hidden rounded bg-slate-100 dark:bg-slate-700">
                    <div style={{ width: `${(e.serviceCostOneTime / maxEnvTotal) * 100}%`, background: GOLD }} />
                    <div style={{ width: `${(e.licensePeriod / maxEnvTotal) * 100}%`, background: ANTHRA }} />
                  </div>
                </div>
              )
            })}
            {view.envs.length === 0 && <Empty t={t} />}
          </div>
        </div>

        {/* Scope-Verteilung */}
        <div className="cc-card p-5">
          <h3 className="mb-3 text-sm font-bold text-cosmo-anthracite dark:text-slate-100">{t('dash_scope_dist')}</h3>
          <div className="flex items-center gap-6">
            <Donut
              segments={[
                { value: view.scope.in, color: '#10b981' },
                { value: view.scope.opt, color: '#f59e0b' },
                { value: view.scope.out, color: '#f43f5e' },
                { value: view.scope.unset, color: '#94a3b8' },
              ]}
              total={scopeTotal}
              center={formatNumber(view.scope.in)}
              caption={t('dash_kpi_inscope')}
            />
            <div className="space-y-2 text-sm">
              <ScopeRow color="#10b981" label={t('scope_in_label')} value={view.scope.in} total={scopeTotal} />
              <ScopeRow color="#f59e0b" label={t('scope_opt_label')} value={view.scope.opt} total={scopeTotal} />
              <ScopeRow color="#f43f5e" label={t('scope_out_label')} value={view.scope.out} total={scopeTotal} />
              <ScopeRow color="#94a3b8" label={t('scope_unset_label')} value={view.scope.unset} total={scopeTotal} />
            </div>
          </div>
        </div>

        {/* Aufwand je Phase */}
        <div className="cc-card p-5">
          <h3 className="mb-3 text-sm font-bold text-cosmo-anthracite dark:text-slate-100">{t('dash_effort_by_phase')}</h3>
          <div className="space-y-2">
            {CALC_PHASE_KEYS.map((k) => (
              <BarRow
                key={k}
                label={t(PHASE_LABEL[k])}
                pct={(view.phaseDays[k] / maxPhase) * 100}
                value={`${formatDays(view.phaseDays[k])} ${t('perDay')}`}
                color={GOLD}
              />
            ))}
          </div>
        </div>

        {/* Aufwand je Prozess */}
        <div className="cc-card p-5">
          <h3 className="mb-3 text-sm font-bold text-cosmo-anthracite dark:text-slate-100">{t('dash_effort_by_process')}</h3>
          <div className="space-y-2">
            {view.processes.slice(0, 10).map((pr) => (
              <BarRow
                key={pr.id}
                label={`${procIcon(pr.id)} ${procName(pr.id)}`}
                pct={(pr.days / maxProc) * 100}
                value={`${formatDays(pr.days)} ${t('perDay')}`}
                sub={procGroup(pr.id)}
                color={ANTHRA}
              />
            ))}
            {view.processes.length === 0 && <Empty t={t} />}
          </div>
        </div>
      </div>

      {/* Schnittstellen (Initiate & Scoping) */}
      {view.allSelected && (calc.interfaceLines.length > 0 || calc.optInterfaceLines.length > 0) && (
        <InterfaceCostCard calc={calc} t={t} formatCurrency={(v) => formatCurrency(v, cur)} />
      )}

      {/* Optionale Positionen (Opt) */}
      <div className="cc-card p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-sm bg-amber-500" />
          <h3 className="text-sm font-bold text-cosmo-anthracite dark:text-slate-100">{t('dash_optional_dist')}</h3>
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
            {view.optCount} {view.optCount === 1 ? t('feature_singular') : t('feature_plural')} ·{' '}
            {formatDays(view.optDays)} {t('perDay')} · {formatCurrency(view.optCost, cur)}
          </span>
        </div>
        {view.optProcesses.length === 0 ? (
          <p className="text-sm text-slate-400">{t('dash_optional_none')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px]">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="cc-th">{t('process_col')}</th>
                  <th className="cc-th text-right">{t('feature_plural')}</th>
                  <th className="cc-th text-right">{t('perDay')}</th>
                  <th className="cc-th text-right">{t('cost')}</th>
                </tr>
              </thead>
              <tbody>
                {view.optProcesses.map((pr) => (
                  <tr key={pr.id} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="cc-td font-medium">{procIcon(pr.id)} {procName(pr.id)}</td>
                    <td className="cc-td text-right">{pr.count}</td>
                    <td className="cc-td text-right">{formatDays(pr.days)}</td>
                    <td className="cc-td text-right">{formatCurrency(pr.cost, cur)}</td>
                  </tr>
                ))}
                <tr className="border-t-2 border-amber-400 font-semibold">
                  <td className="cc-td">Σ</td>
                  <td className="cc-td text-right">{view.optCount}</td>
                  <td className="cc-td text-right">{formatDays(view.optDays)}</td>
                  <td className="cc-td text-right">{formatCurrency(view.optCost, cur)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Lizenzen je Environment */}
      <div className="cc-card overflow-x-auto p-5">
        <h3 className="mb-3 text-sm font-bold text-cosmo-anthracite dark:text-slate-100">{t('dash_licenses')}</h3>
        <table className="w-full min-w-[560px]">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700">
              <th className="cc-th">Environment</th>
              <th className="cc-th text-right">{t('dash_license_month')}</th>
              <th className="cc-th text-right">{t('dash_license_year')}</th>
              <th className="cc-th text-right">{t('dash_license_period')}</th>
            </tr>
          </thead>
          <tbody>
            {view.envs.map((e) => (
              <tr key={e.id} className="border-b border-slate-100 dark:border-slate-800">
                <td className="cc-td font-medium">{e.name}</td>
                <td className="cc-td text-right">{formatCurrency(e.licenseMonthly, cur)}</td>
                <td className="cc-td text-right">{formatCurrency(e.licenseYearly, cur)}</td>
                <td className="cc-td text-right">{formatCurrency(e.licensePeriod, cur)}</td>
              </tr>
            ))}
            <tr className="border-t-2 border-cosmo-gold font-semibold">
              <td className="cc-td">Σ</td>
              <td className="cc-td text-right">{formatCurrency(view.licenseMonthly, cur)}</td>
              <td className="cc-td text-right">{formatCurrency(view.licenseMonthly * 12, cur)}</td>
              <td className="cc-td text-right">{formatCurrency(view.licensePeriod, cur)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Optionale Lizenzen je Environment */}
      {view.optionalLicenseMonthly > 0 && (
        <div className="cc-card overflow-x-auto p-5">
          <h3 className="mb-3 text-sm font-bold text-cosmo-gold-dark">{t('dash_optional_licenses')}</h3>
          <table className="w-full min-w-[560px]">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="cc-th">Environment</th>
                <th className="cc-th text-right">{t('dash_license_month')}</th>
                <th className="cc-th text-right">{t('dash_license_year')}</th>
                <th className="cc-th text-right">{t('dash_license_period')}</th>
              </tr>
            </thead>
            <tbody>
              {view.envs
                .filter((e) => e.optionalLicenseMonthly > 0)
                .map((e) => (
                  <tr key={e.id} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="cc-td font-medium">{e.name}</td>
                    <td className="cc-td text-right">{formatCurrency(e.optionalLicenseMonthly, cur)}</td>
                    <td className="cc-td text-right">{formatCurrency(e.optionalLicenseYearly, cur)}</td>
                    <td className="cc-td text-right">{formatCurrency(e.optionalLicensePeriod, cur)}</td>
                  </tr>
                ))}
              <tr className="border-t-2 border-cosmo-gold font-semibold text-cosmo-gold-dark">
                <td className="cc-td">Σ</td>
                <td className="cc-td text-right">{formatCurrency(view.optionalLicenseMonthly, cur)}</td>
                <td className="cc-td text-right">{formatCurrency(view.optionalLicenseMonthly * 12, cur)}</td>
                <td className="cc-td text-right">{formatCurrency(view.optionalLicensePeriod, cur)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Interessent & Projekt-Eckdaten */}
      <div className="cc-card p-5">
        <h3 className="mb-3 text-sm font-bold text-cosmo-anthracite dark:text-slate-100">{t('dash_prospect')}</h3>
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm md:grid-cols-3">
          <Info label={t('tab_prospect')} value={p.company} />
          <Info label="Kontakt" value={p.contact} />
          <Info label="Branche" value={(lang === 'de' ? findIndustry(p.industryId, state.parameters.customIndustries)?.label : findIndustry(p.industryId, state.parameters.customIndustries)?.labelEN) || p.industryId} />
          <Info label="Branchenmodell" value={lang === 'de' ? archetypeById(p.archetypeId).label : archetypeById(p.archetypeId).labelEN} />
          <Info label="Land" value={p.country} />
          <Info label="Größe" value={p.size} />
          <Info label="Projektstart" value={p.projectStart} />
          <Info label="Go-Live" value={p.goLive} />
          <Info label="Environments" value={`${state.environments.length}`} />
        </div>
      </div>

      {/* Versionsvergleich */}
      <div className="cc-card p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <button
            className="flex items-center gap-2 text-sm font-bold text-cosmo-anthracite dark:text-slate-100"
            onClick={() => setShowVersions((v) => !v)}
            aria-expanded={showVersions}
            title={showVersions ? t('dash_versions_hide') : t('dash_versions_show')}
          >
            <span className={`text-cosmo-gold transition-transform ${showVersions ? 'rotate-90' : ''}`}>▸</span>
            {t('dash_versions')}
            {versions.length > 0 && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500 dark:bg-slate-700 dark:text-slate-300">
                {versions.length}
              </span>
            )}
          </button>
          <div className="flex items-center gap-2">
            {versions.length > 0 && showVersions && (
              <button
                className="cc-btn-ghost cc-no-print"
                onClick={() => exportVersionComparison(p.company, versions)}
              >
                ⭳ {t('dash_export_versions')}
              </button>
            )}
            <button
              className="cc-btn-ghost cc-no-print"
              onClick={() => setShowVersions((v) => !v)}
              aria-expanded={showVersions}
            >
              {showVersions ? `▾ ${t('dash_versions_hide')}` : `▸ ${t('dash_versions_show')}`}
            </button>
          </div>
        </div>
        {showVersions && (
          <>
            {versions.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">{t('dash_versions_none')}</p>
            ) : (
              <>
                <div className="mb-4 space-y-2">
                  {(() => {
                    const maxV = Math.max(1, ...versions.map((v) => v.kpis.totalPeriod))
                    return versions.map((v) => (
                      <BarRow
                        key={v.id}
                        label={v.label}
                        pct={(v.kpis.totalPeriod / maxV) * 100}
                        value={formatCurrency(v.kpis.totalPeriod, cur)}
                        sub={new Date(v.createdAt).toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-US')}
                        color={GOLD}
                      />
                    ))
                  })()}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px]">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700">
                        <th className="cc-th">Version</th>
                        <th className="cc-th text-right">{t('perDay')}</th>
                        <th className="cc-th text-right">{t('dash_license_month')}</th>
                        <th className="cc-th text-right">{t('dash_kpi_investment')}</th>
                        <th className="cc-th text-right">In Scope</th>
                      </tr>
                    </thead>
                    <tbody>
                      {versions.map((v) => (
                        <tr key={v.id} className="border-b border-slate-100 dark:border-slate-800">
                          <td className="cc-td font-medium">{v.label}</td>
                          <td className="cc-td text-right">{formatDays(v.kpis.serviceDays)}</td>
                          <td className="cc-td text-right">{formatCurrency(v.kpis.licenseMonthly, cur)}</td>
                          <td className="cc-td text-right">{formatCurrency(v.kpis.totalPeriod, cur)}</td>
                          <td className="cc-td text-right">{v.kpis.inScope}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            <p className="mt-3 text-xs text-slate-400">{t('dash_versions_hint')}</p>
          </>
        )}
      </div>
    </div>
  )
}

/* ── Subkomponenten ──────────────────────────────────────────────────────── */

function Kpi({ label, value, sub, gold }: { label: string; value: string; sub?: string; gold?: boolean }) {
  return (
    <div className={`cc-kpi ${gold ? 'border-cosmo-gold/60' : ''}`}>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</div>
      <div className={`mt-1 text-lg font-bold ${gold ? 'text-cosmo-gold-dark dark:text-cosmo-gold' : 'text-cosmo-anthracite dark:text-slate-100'}`}>{value}</div>
      {sub && <div className="text-[11px] text-slate-400">{sub}</div>}
    </div>
  )
}

function Slicer({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="cc-card p-3">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</div>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  )
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? 'bg-cosmo-gold text-white'
          : 'border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300'
      }`}
    >
      {children}
    </button>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="inline-block h-3 w-3 rounded-sm" style={{ background: color }} />
      {label}
    </span>
  )
}

function BarRow({ label, pct, value, sub, color }: { label: string; pct: number; value: string; sub?: string; color: string }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="truncate pr-2 font-medium text-slate-700 dark:text-slate-200">{label}</span>
        <span className="shrink-0 text-slate-500 dark:text-slate-400">{value}</span>
      </div>
      <div className="h-3 overflow-hidden rounded bg-slate-100 dark:bg-slate-700">
        <div className="h-full rounded" style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: color }} />
      </div>
      {sub && <div className="mt-0.5 text-[10px] text-slate-400">{sub}</div>}
    </div>
  )
}

function ScopeRow({ color, label, value, total }: { color: string; label: string; value: number; total: number }) {
  const pct = total ? Math.round((value / total) * 100) : 0
  return (
    <div className="flex items-center gap-2">
      <span className="inline-block h-3 w-3 rounded-sm" style={{ background: color }} />
      <span className="text-slate-600 dark:text-slate-300">{label}</span>
      <span className="ml-auto font-semibold text-slate-700 dark:text-slate-100">{value}</span>
      <span className="w-10 text-right text-xs text-slate-400">{pct}%</span>
    </div>
  )
}

function Donut({ segments, total, center, caption }: { segments: { value: number; color: string }[]; total: number; center: string; caption: string }) {
  let acc = 0
  const stops: string[] = []
  for (const s of segments) {
    const start = (acc / total) * 360
    acc += s.value
    const end = (acc / total) * 360
    stops.push(`${s.color} ${start}deg ${end}deg`)
  }
  if (acc < total) stops.push(`#e2e8f0 ${(acc / total) * 360}deg 360deg`)
  return (
    <div className="relative h-32 w-32 shrink-0">
      <div className="h-full w-full rounded-full" style={{ background: `conic-gradient(${stops.join(',')})` }} />
      <div className="absolute inset-[18%] flex flex-col items-center justify-center rounded-full bg-white text-center dark:bg-[#1c2230]">
        <span className="text-lg font-bold text-cosmo-anthracite dark:text-slate-100">{center}</span>
        <span className="px-1 text-[9px] leading-tight text-slate-400">{caption}</span>
      </div>
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className="text-slate-700 dark:text-slate-200">{value || '—'}</div>
    </div>
  )
}

function Empty({ t }: { t: (k: string) => string }) {
  return <p className="text-sm text-slate-400">{t('dash_empty')}</p>
}

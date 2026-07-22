import { useMemo } from 'react'
import { useStore } from '../../lib/store'
import { useLang } from '../../i18n/LanguageContext'
import { catalogsForState } from '../../lib/mbpcCatalog'
import { CALC_PHASE_KEYS } from '../../types'
import type { PhaseKey } from '../../types'
import { calculate, formatCurrency, formatDays, formatNumber } from '../../lib/calc'
import { PanelTitle } from './ProspectPanel'

const PHASE_LABEL: Record<PhaseKey, string> = {
  strategize: 'phase_strategize',
  initiate: 'phase_initiate',
  build: 'phase_build',
  prepare: 'phase_prepare',
  operate: 'phase_operate',
}

const FIT_COLORS = ['bg-rose-400', 'bg-orange-400', 'bg-amber-400', 'bg-lime-500', 'bg-emerald-500']

export function SummaryPanel() {
  const { t, lang } = useLang()
  const { state, update } = useStore()
  const calc = useMemo(() => calculate(state), [state])
  const cur = state.parameters.currency

  const coverage = calc.scopeStats.total ? (calc.scopeStats.in / calc.scopeStats.total) * 100 : 0
  const fitRatio =
    calc.standardCount + calc.customCount > 0
      ? (calc.standardCount / (calc.standardCount + calc.customCount)) * 100
      : 0
  const maxPhase = Math.max(1, ...CALC_PHASE_KEYS.map((p) => calc.phaseDays[p]))

  // Prozesse mit In-Scope-Anteil (über alle Environments) für die fachliche Bewertung
  const scopedProcesses = catalogsForState(state).filter((p) => {
    const anyScoped = state.environments.some((e) => {
      const s = e.scope.proc[p.id]
      return s === 'in' || s === 'opt'
    })
    return anyScoped || calc.features.some((f) => f.processId === p.id)
  })

  // Aggregierter Fit-Score (Durchschnitt über Environments, in denen gesetzt)
  const aggFit = (pid: string): number => {
    const vals = state.environments
      .map((e) => e.scope.fit[pid])
      .filter((v): v is number => typeof v === 'number')
    if (!vals.length) return 3
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
  }
  const setFit = (pid: string, n: number) =>
    update((d) => d.environments.forEach((e) => (e.scope.fit[pid] = n)))

  return (
    <div className="space-y-5">
      <PanelTitle title={t('tab_summary')} intro={t('summary_intro')} />

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <Kpi label={t('kpi_investment')} value={formatCurrency(calc.totalPeriod, cur)} sub={`${calc.periodMonths} ${t('months')}`} gold />
        <Kpi label={t('kpi_effort')} value={`${formatDays(calc.serviceDays)} ${t('perDay')}`} sub={`${calc.features.length} Features`} />
        <Kpi label={t('kpi_coverage')} value={`${formatNumber(coverage)} %`} sub={`${calc.scopeStats.in}/${calc.scopeStats.total}`} />
        <Kpi label={t('kpi_fit')} value={`${formatNumber(fitRatio)} %`} sub={`${calc.standardCount} / ${calc.customCount} ${t('fit_custom')}`} />
        <Kpi label={t('kpi_duration')} value={durationLabel(state.prospect.projectStart, state.prospect.goLive, t)} sub={state.prospect.goLive || '—'} />
        <Kpi label={t('kpi_countries')} value={`${calc.distinctCountries} / ${state.environments.length}`} sub={calc.distinctCountries > 1 ? t('multi_country') : t('single_country')} />
      </div>

      {/* Aufwand je Phase */}
      <div className="cc-card p-5">
        <div className="mb-4 font-bold text-cosmo-anthracite">{t('effort_by_phase')}</div>
        <div className="space-y-3">
          {CALC_PHASE_KEYS.map((ph) => (
            <div key={ph} className="flex items-center gap-3">
              <div className="w-40 shrink-0 text-sm text-slate-600">{t(PHASE_LABEL[ph])}</div>
              <div className="h-6 flex-1 overflow-hidden rounded-md bg-slate-100">
                <div
                  className="flex h-full items-center justify-end bg-cosmo-gold px-2 text-xs font-semibold text-white"
                  style={{ width: `${(calc.phaseDays[ph] / maxPhase) * 100}%`, minWidth: calc.phaseDays[ph] ? '2.5rem' : 0 }}
                >
                  {calc.phaseDays[ph] ? formatDays(calc.phaseDays[ph]) : ''}
                </div>
              </div>
              <div className="w-28 shrink-0 text-right text-sm font-semibold text-cosmo-anthracite">
                {formatCurrency(calc.phaseCost[ph], cur)}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex justify-between border-t border-slate-100 pt-3 text-sm">
          <span className="text-slate-500">
            Overhead: <b className="text-cosmo-anthracite">{formatDays(calc.overheadDays)} {t('perDay')}</b> ·{' '}
            {formatCurrency(calc.overheadCost, cur)}
          </span>
          <span className="font-bold text-cosmo-anthracite">
            {t('services')}: {formatCurrency(calc.serviceCostOneTime, cur)}
          </span>
        </div>
        {/* Overhead-Details */}
        <div className="mt-2 flex flex-wrap gap-2">
          {calc.overheadLines.map((o) => (
            <span
              key={o.name}
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                o.applied ? 'bg-cosmo-gold/10 text-cosmo-gold-dark' : 'bg-slate-100 text-slate-400 line-through'
              }`}
              title={o.reason}
            >
              {o.name}: {formatCurrency(o.cost, cur)}
              {o.reason && !o.applied ? ` (${o.reason})` : ''}
            </span>
          ))}
        </div>
      </div>

      {/* Fachliche Bewertung je E2E-Prozess */}
      <div className="cc-card p-5">
        <div className="mb-4 font-bold text-cosmo-anthracite">{t('process_fit')}</div>
        <div className="space-y-2">
          {scopedProcesses.map((p) => {
            const fit = aggFit(p.id)
            return (
              <div key={p.id} className="flex items-center gap-3">
                <span className="text-lg">{p.icon}</span>
                <span className="w-56 shrink-0 truncate text-sm font-semibold text-slate-700">
                  {lang === 'de' ? p.nameDE : p.nameEN}
                </span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      onClick={() => setFit(p.id, n)}
                      className={`h-6 w-6 rounded ${n <= fit ? FIT_COLORS[fit - 1] : 'bg-slate-100'} transition-colors`}
                      title={`${t('fit_score')} ${n}`}
                    />
                  ))}
                </div>
                <span className="ml-2 text-sm text-slate-500">
                  {t('fit_score')}: <b>{fit}/5</b>
                </span>
                <span className="ml-auto text-xs text-slate-400">
                  {calc.features.filter((f) => f.processId === p.id).length} Features ·{' '}
                  {formatDays(calc.features.filter((f) => f.processId === p.id).reduce((s, f) => s + f.days, 0))} {t('perDay')}
                </span>
              </div>
            )
          })}
          {scopedProcesses.length === 0 && (
            <div className="text-sm text-slate-400">{t('no_scoped_processes')}</div>
          )}
        </div>
      </div>

      {/* Kosten je Environment */}
      <div className="cc-card overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50/60 px-4 py-2 font-bold text-cosmo-anthracite">
          {t('cost_by_env')}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="cc-th">Environment</th>
                <th className="cc-th text-center">{t('country')}</th>
                <th className="cc-th text-right">{t('users')}</th>
                <th className="cc-th text-right">{t('service_onetime')}</th>
                <th className="cc-th text-right">{t('monthly')}</th>
                <th className="cc-th text-right">{t('total_period')}</th>
              </tr>
            </thead>
            <tbody>
              {calc.perEnvironment.map((e) => (
                <tr key={e.id} className="border-b border-slate-50">
                  <td className="cc-td font-semibold">{e.name}</td>
                  <td className="cc-td text-center">{e.country}</td>
                  <td className="cc-td text-right">{e.users}</td>
                  <td className="cc-td text-right">{formatCurrency(e.serviceCostOneTime, cur)}</td>
                  <td className="cc-td text-right">{formatCurrency(e.licenseMonthly, cur)}</td>
                  <td className="cc-td text-right font-semibold">{formatCurrency(e.totalPeriod, cur)}</td>
                </tr>
              ))}
              <tr className="bg-slate-50/60 font-bold">
                <td className="cc-td" colSpan={3}>
                  {t('overall')} — {t('services')} ({t('onetime_incl_overhead')}) + {t('licenses')}
                </td>
                <td className="cc-td text-right">{formatCurrency(calc.serviceCostOneTime, cur)}</td>
                <td className="cc-td text-right">{formatCurrency(calc.licenseMonthly, cur)}</td>
                <td className="cc-td text-right text-cosmo-gold">{formatCurrency(calc.totalPeriod, cur)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap justify-end gap-6 px-4 py-3 text-sm">
          <span className="text-slate-500">
            {t('service_onetime')}: <b className="text-cosmo-anthracite">{formatCurrency(calc.serviceCostOneTime, cur)}</b>
          </span>
          <span className="text-slate-500">
            {t('license_monthly')}: <b className="text-cosmo-anthracite">{formatCurrency(calc.licenseMonthly, cur)}</b>
          </span>
          <span className="font-bold text-cosmo-gold">
            {t('kpi_investment')}: {formatCurrency(calc.totalPeriod, cur)}
          </span>
        </div>
      </div>
    </div>
  )
}

function Kpi({ label, value, sub, gold }: { label: string; value: string; sub?: string; gold?: boolean }) {
  return (
    <div className={`cc-kpi ${gold ? 'border-cosmo-gold/40 bg-cosmo-gold/5' : ''}`}>
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className={`mt-1 text-lg font-bold ${gold ? 'text-cosmo-gold' : 'text-cosmo-anthracite'}`}>{value}</div>
      {sub && <div className="text-xs text-slate-400">{sub}</div>}
    </div>
  )
}

function durationLabel(start: string, end: string, t: (k: string) => string): string {
  if (!start || !end) return '—'
  const s = new Date(start)
  const e = new Date(end)
  const months = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth())
  if (isNaN(months) || months <= 0) return '—'
  return `${months} ${t('months_short')}`
}

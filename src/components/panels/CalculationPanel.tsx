import { useStore } from '../../lib/store'
import { useLang } from '../../i18n/LanguageContext'
import { featureKey } from '../../data/catalog'
import { catalogForEnvironment } from '../../lib/mbpcCatalog'
import { COMPLEXITY_KEYS, CALC_PHASE_KEYS } from '../../types'
import type { Complexity, PhaseKey, ScopeStatus } from '../../types'
import { effortForComplexity } from '../../data/seed'
import { activeEnvironment, complexityFactor, effectiveFeatureScope, formatDays } from '../../lib/calc'
import { useCurrencyView } from '../../lib/currencyView'
import { CurrencyToggle } from '../CurrencyToggle'
import { EnvSelector } from '../EnvSelector'
import { PanelTitle } from './ProspectPanel'

const PHASE_LABEL: Record<PhaseKey, string> = {
  strategize: 'phase_strategize',
  initiate: 'phase_initiate',
  build: 'phase_build',
  prepare: 'phase_prepare',
  operate: 'phase_operate',
}

const COMPLEXITY_LABEL: Record<Complexity, string> = {
  small: 'complexity_small',
  medium: 'complexity_medium',
  complex: 'complexity_complex',
}

const COMPLEXITY_HINT: Record<Complexity, string> = {
  small: 'complexity_small_hint',
  medium: 'complexity_medium_hint',
  complex: 'complexity_complex_hint',
}

export function CalculationPanel() {
  const { t, lang } = useLang()
  const { state, update } = useStore()
  const params = state.parameters
  const hoursMode = params.unit === 'hours'
  const { fmt } = useCurrencyView()
  const env = activeEnvironment(state)
  const scope = env?.scope

  function roleName(roleId: string) {
    return params.roles.find((r) => r.id === roleId)?.name || '—'
  }
  function roleRate(roleId: string) {
    return params.roles.find((r) => r.id === roleId)?.rate || 0
  }

  function setEffort(key: string, phase: PhaseKey, displayValue: number) {
    const days = hoursMode ? displayValue / (params.hoursPerDay || 8) : displayValue
    update((d) => {
      const e = d.environments.find((x) => x.id === d.activeEnvironmentId) || d.environments[0]
      const fs = e?.scope.feature[key]
      if (fs) {
        fs.effort[phase] = Math.max(0, days)
        // manuelle Anpassung: Vorlagen-Markierung entfernen
        fs.complexity = undefined
      }
    })
  }
  function toggleStandard(key: string) {
    update((d) => {
      const e = d.environments.find((x) => x.id === d.activeEnvironmentId) || d.environments[0]
      const fs = e?.scope.feature[key]
      if (fs) fs.standard = !fs.standard
    })
  }
  function toggleUnit() {
    update((d) => {
      d.parameters.unit = d.parameters.unit === 'days' ? 'hours' : 'days'
    })
  }
  function setAdjust(c: Complexity, pct: number) {
    update((d) => {
      const cur = d.parameters.complexityAdjust ?? { small: 0, medium: 0, complex: 0 }
      d.parameters.complexityAdjust = { ...cur, [c]: Math.max(-100, Math.min(100, Math.round(pct))) }
    })
  }
  const adjust = params.complexityAdjust ?? { small: 0, medium: 0, complex: 0 }

  /**
   * Wendet eine erfahrungsbasierte Aufwands-Vorlage (Small/Middle/Complex) auf
   * ein Feature an: lädt die SbD-Phasenwerte, merkt sich die Komplexität und
   * setzt Fit/Gap automatisch (Komplex = Customization/Gap).
   */
  function applyComplexity(keys: string | string[], c: Complexity) {
    const list = Array.isArray(keys) ? keys : [keys]
    update((d) => {
      const e = d.environments.find((x) => x.id === d.activeEnvironmentId) || d.environments[0]
      if (!e) return
      list.forEach((key) => {
        const fs = e.scope.feature[key]
        if (!fs) return
        fs.effort = effortForComplexity(c)
        fs.complexity = c
        fs.standard = c !== 'complex'
      })
    })
  }

  // Features je Prozess sammeln, gefiltert auf einen Scope-Status (in / opt)
  function collectRows(target: ScopeStatus) {
    if (!scope) return []
    return catalogForEnvironment(env)
      .map((proc) => {
        const items: { key: string; label: string; areaIdx: number; stepIdx: number }[] = []
        proc.areas.forEach((area, areaIdx) => {
          area.steps.forEach((label, stepIdx) => {
            const key = featureKey(proc.id, areaIdx, stepIdx)
            const fs = scope.feature[key]
            if (!fs) return
            if (effectiveFeatureScope(scope, proc.id, areaIdx, stepIdx) !== target) return
            items.push({ key, label: lang === 'de' ? label : area.stepsEN[stepIdx] || label, areaIdx, stepIdx })
          })
        })
        return { proc, items }
      })
      .filter((r) => r.items.length > 0)
  }

  // In-Scope-Features je Prozess
  const rows = collectRows('in')
  // Optionale (Opt) Features je Prozess – separat ausgewiesen
  const optRows = collectRows('opt')

  const unitLabel = hoursMode ? t('hours') : t('days')

  const allKeys = rows.flatMap((r) => r.items.map((i) => i.key))
  function bulkApply(c: Complexity) {
    if (allKeys.length === 0) return
    const label = t(COMPLEXITY_LABEL[c])
    const msg = t('complexity_confirm_all').replace('{v}', label).replace('{n}', String(allKeys.length))
    if (typeof window !== 'undefined' && !window.confirm(msg)) return
    applyComplexity(allKeys, c)
  }

  const factor = hoursMode ? params.hoursPerDay || 8 : 1

  // Summen der optionalen Positionen (Tage/Kosten) für die Abschnitts-Überschrift
  const optFeatureCount = optRows.reduce((s, r) => s + r.items.length, 0)
  let optTotalDays = 0
  let optTotalCost = 0
  optRows.forEach((r) =>
    r.items.forEach(({ key }) => {
      const fs = scope?.feature[key]
      if (!fs) return
      const adj = complexityFactor(params, fs.complexity)
      CALC_PHASE_KEYS.forEach((ph) => {
        const d = (fs.effort[ph] || 0) * adj
        optTotalDays += d
        optTotalCost += d * roleRate(params.phaseRole[ph])
      })
    }),
  )

  // Basis- und angepasste Tage je Komplexität (In-Scope + Opt) für die Regler
  const adjustStats = COMPLEXITY_KEYS.map((c) => {
    let count = 0
    let base = 0
    ;[...rows, ...optRows].forEach((r) =>
      r.items.forEach(({ key }) => {
        const fs = scope?.feature[key]
        if (!fs || fs.complexity !== c) return
        count++
        base += CALC_PHASE_KEYS.reduce((s, ph) => s + (fs.effort[ph] || 0), 0)
      }),
    )
    return { c, count, base, adjusted: base * complexityFactor(params, c) }
  })

  function renderProcessCard(proc: { id: string; icon: string; nameDE: string; nameEN: string }, items: { key: string; label: string }[]) {
    return (
      <div key={proc.id} className="cc-card overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-50/60 px-4 py-2">
          <span className="text-lg">{proc.icon}</span>
          <span className="font-bold text-cosmo-anthracite">{lang === 'de' ? proc.nameDE : proc.nameEN}</span>
          <div className="ml-auto flex items-center gap-1.5" title={t('complexity_apply_proc')}>
            <span className="text-[11px] text-slate-400">{t('complexity_col')}:</span>
            {COMPLEXITY_KEYS.map((c) => (
              <button
                key={c}
                onClick={() => applyComplexity(items.map((i) => i.key), c)}
                title={t(COMPLEXITY_HINT[c])}
                className="rounded border border-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-500 transition-colors hover:border-cosmo-gold hover:text-cosmo-gold-dark dark:border-slate-600"
              >
                {t(COMPLEXITY_LABEL[c])}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px]">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="cc-th w-[24%]">{t('feature_col')}</th>
                <th className="cc-th text-center">{t('complexity_col')}</th>
                {CALC_PHASE_KEYS.map((ph) => (
                  <th key={ph} className="cc-th text-center" title={roleName(params.phaseRole[ph])}>
                    {t(PHASE_LABEL[ph])}
                    <div className="text-[10px] font-normal normal-case text-slate-400">
                      {roleName(params.phaseRole[ph])}
                    </div>
                  </th>
                ))}
                <th className="cc-th text-center">Σ {unitLabel}</th>
                <th className="cc-th text-right">{t('cost')}</th>
                <th className="cc-th text-center">{t('fit_col')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map(({ key, label }) => {
                const fs = scope!.feature[key]!
                const adj = complexityFactor(params, fs.complexity)
                let days = 0
                let cost = 0
                CALC_PHASE_KEYS.forEach((ph) => {
                  const d = (fs.effort[ph] || 0) * adj
                  days += d
                  cost += d * roleRate(params.phaseRole[ph])
                })
                return (
                  <tr key={key} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="cc-td">{label}</td>
                    <td className="cc-td text-center">
                      <div className="inline-flex overflow-hidden rounded border border-slate-200 dark:border-slate-600">
                        {COMPLEXITY_KEYS.map((c) => (
                          <button
                            key={c}
                            onClick={() => applyComplexity(key, c)}
                            title={t(COMPLEXITY_HINT[c])}
                            className={`px-1.5 py-0.5 text-[11px] font-semibold transition-colors ${
                              fs.complexity === c
                                ? 'bg-cosmo-gold text-white'
                                : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'
                            }`}
                          >
                            {t(COMPLEXITY_LABEL[c]).charAt(0)}
                          </button>
                        ))}
                      </div>
                    </td>
                    {CALC_PHASE_KEYS.map((ph) => (
                      <td key={ph} className="cc-td text-center">
                        <input
                          type="number"
                          min={0}
                          step={hoursMode ? 1 : 0.25}
                          value={+((fs.effort[ph] || 0) * factor).toFixed(2) || ''}
                          onChange={(e) => setEffort(key, ph, parseFloat(e.target.value) || 0)}
                          className="w-16 rounded border border-slate-200 px-1.5 py-1 text-center text-xs outline-none focus:border-cosmo-gold dark:border-slate-600 dark:bg-[#232a37] dark:text-slate-100 dark:placeholder:text-slate-500"
                        />
                      </td>
                    ))}
                    <td className="cc-td text-center font-semibold">
                      {formatDays(days * factor)}
                      {adj !== 1 && (
                        <div className="text-[10px] font-normal text-cosmo-gold-dark" title={t('complexity_adjust_active')}>
                          {adj > 1 ? '+' : '−'}
                          {Math.round(Math.abs(adj - 1) * 100)} %
                        </div>
                      )}
                    </td>
                    <td className="cc-td text-right font-semibold text-cosmo-anthracite">
                      {fmt(cost)}
                    </td>
                    <td className="cc-td text-center">
                      <button
                        onClick={() => toggleStandard(key)}
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          fs.standard ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'
                        }`}
                      >
                        {fs.standard ? t('fit_standard') : t('fit_custom')}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PanelTitle title={t('tab_calculation')} intro={t('calc_intro')} />
        <div className="flex flex-wrap items-center gap-2">
          <CurrencyToggle />
          <button className="cc-btn-ghost" onClick={toggleUnit}>
            {t('unit_toggle')}: <b className="ml-1">{hoursMode ? t('hours') : t('days')}</b>
          </button>
        </div>
      </div>

      <EnvSelector />

      <div className="cc-card space-y-3 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {t('complexity_adjust_label')}
            </span>
            {COMPLEXITY_KEYS.some((c) => adjust[c] !== 0) && (
              <button
                className="ml-auto rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-500 hover:border-cosmo-gold hover:text-cosmo-gold-dark dark:border-slate-600"
                onClick={() => COMPLEXITY_KEYS.forEach((c) => setAdjust(c, 0))}
              >
                {t('complexity_adjust_reset')}
              </button>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">{t('complexity_adjust_hint')}</p>
          <div className="grid gap-4 md:grid-cols-3">
            {adjustStats.map(({ c, count, base, adjusted }) => (
              <label key={c} className="block" title={t(COMPLEXITY_HINT[c])}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-semibold text-cosmo-anthracite dark:text-slate-100">{t(COMPLEXITY_LABEL[c])}</span>
                  <span className={`text-sm font-semibold ${adjust[c] === 0 ? 'text-slate-400' : 'text-cosmo-gold-dark'}`}>
                    {adjust[c] > 0 ? '+' : adjust[c] < 0 ? '−' : '±'}
                    {Math.abs(adjust[c])} %
                  </span>
                </div>
                <input
                  type="range"
                  min={-100}
                  max={100}
                  step={5}
                  value={adjust[c]}
                  onChange={(e) => setAdjust(c, Number(e.target.value))}
                  onDoubleClick={() => setAdjust(c, 0)}
                  aria-label={`${t(COMPLEXITY_LABEL[c])} ${t('complexity_adjust_label')}`}
                  className="mt-1 w-full accent-cosmo-gold"
                />
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>
                    {count} {t('complexity_adjust_positions')}
                  </span>
                  <span>
                    {formatDays(base * factor)} → <b className="text-slate-600 dark:text-slate-200">{formatDays(adjusted * factor)}</b> {unitLabel}
                  </span>
                </div>
              </label>
            ))}
          </div>
        </div>

      {rows.length > 0 && (
        <div className="cc-card flex flex-wrap items-center gap-2 p-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {t('complexity_bulk_label')}
          </span>
          <div className="ml-auto flex flex-wrap gap-1.5">
            {COMPLEXITY_KEYS.map((c) => (
              <button
                key={c}
                onClick={() => bulkApply(c)}
                title={t(COMPLEXITY_HINT[c])}
                className="rounded-full border border-cosmo-gold/50 bg-cosmo-gold/10 px-3 py-1 text-xs font-semibold text-cosmo-gold-dark transition-colors hover:bg-cosmo-gold/20 dark:text-amber-200"
              >
                {t(COMPLEXITY_LABEL[c])} <span className="opacity-60">· {t('complexity_apply_all')}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {rows.length === 0 && (
        <div className="cc-card p-8 text-center text-sm text-slate-400">
          {t('no_inscope_features')}
        </div>
      )}

      {rows.map(({ proc, items }) => renderProcessCard(proc, items))}

      {/* Optionale (Opt) Positionen – separat ausgewiesen */}
      {optRows.length > 0 && (
        <div className="space-y-4 border-t-2 border-dashed border-amber-300 pt-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-sm bg-amber-500" />
            <h3 className="text-base font-bold text-cosmo-anthracite dark:text-slate-100">
              {t('calc_optional_section')}
            </h3>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
              {optFeatureCount} {optFeatureCount === 1 ? t('feature_singular') : t('feature_plural')} ·{' '}
              {formatDays(optTotalDays * factor)} {unitLabel} · {fmt(optTotalCost)}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">{t('calc_optional_intro')}</p>
          {optRows.map(({ proc, items }) => renderProcessCard(proc, items))}
        </div>
      )}
    </div>
  )
}

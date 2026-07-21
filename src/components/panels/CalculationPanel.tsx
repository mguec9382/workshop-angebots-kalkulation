import { useStore } from '../../lib/store'
import { useLang } from '../../i18n/LanguageContext'
import { featureKey } from '../../data/catalog'
import { catalogForEnvironment } from '../../lib/mbpcCatalog'
import { COMPLEXITY_KEYS, PHASE_KEYS } from '../../types'
import type { Complexity, PhaseKey } from '../../types'
import { effortForComplexity } from '../../data/seed'
import { activeEnvironment, effectiveFeatureScope, formatCurrency, formatDays } from '../../lib/calc'
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
  const cur = params.currency
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

  // In-Scope-Features je Prozess sammeln
  const rows = !scope
    ? []
    : catalogForEnvironment(env).map((proc) => {
        const items: { key: string; label: string; areaIdx: number; stepIdx: number }[] = []
        proc.areas.forEach((area, areaIdx) => {
          area.steps.forEach((label, stepIdx) => {
            const key = featureKey(proc.id, areaIdx, stepIdx)
            const fs = scope.feature[key]
            if (!fs) return
            if (effectiveFeatureScope(scope, proc.id, areaIdx, stepIdx) !== 'in') return
            items.push({ key, label: lang === 'de' ? label : area.stepsEN[stepIdx] || label, areaIdx, stepIdx })
          })
        })
        return { proc, items }
      }).filter((r) => r.items.length > 0)

  const unitLabel = hoursMode ? t('hours') : t('days')

  const allKeys = rows.flatMap((r) => r.items.map((i) => i.key))
  function bulkApply(c: Complexity) {
    if (allKeys.length === 0) return
    const label = t(COMPLEXITY_LABEL[c])
    const msg = t('complexity_confirm_all').replace('{v}', label).replace('{n}', String(allKeys.length))
    if (typeof window !== 'undefined' && !window.confirm(msg)) return
    applyComplexity(allKeys, c)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PanelTitle title={t('tab_calculation')} intro={t('calc_intro')} />
        <button className="cc-btn-ghost" onClick={toggleUnit}>
          {t('unit_toggle')}: <b className="ml-1">{hoursMode ? t('hours') : t('days')}</b>
        </button>
      </div>

      <EnvSelector />

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

      {rows.map(({ proc, items }) => (
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
                  {PHASE_KEYS.map((ph) => (
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
                  let days = 0
                  let cost = 0
                  PHASE_KEYS.forEach((ph) => {
                    const d = fs.effort[ph] || 0
                    days += d
                    cost += d * roleRate(params.phaseRole[ph])
                  })
                  const factor = hoursMode ? params.hoursPerDay || 8 : 1
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
                      {PHASE_KEYS.map((ph) => (
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
                      <td className="cc-td text-center font-semibold">{formatDays(days * factor)}</td>
                      <td className="cc-td text-right font-semibold text-cosmo-anthracite">
                        {formatCurrency(cost, cur)}
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
      ))}
    </div>
  )
}

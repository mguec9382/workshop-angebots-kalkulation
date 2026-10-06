import { useMemo } from 'react'
import { useStore } from '../../lib/store'
import { useLang } from '../../i18n/LanguageContext'
import { calculate, formatDays } from '../../lib/calc'
import { useCurrencyView } from '../../lib/currencyView'
import { uid } from '../../data/seed'
import { COMPLEXITY_KEYS, DEFAULT_INTEGRATION_PLATFORM, INTERFACE_EFFORT } from '../../types'
import type { Complexity, InterfaceDirection, InterfaceItem, ScopeStatus } from '../../types'
import { CurrencyToggle } from '../CurrencyToggle'
import { ScopeSegment } from '../ScopeSegment'
import { PanelTitle } from './ProspectPanel'

const COMPLEXITY_LABEL: Record<Complexity, string> = {
  small: 'complexity_small',
  medium: 'complexity_medium',
  complex: 'complexity_complex',
}

const DIRECTIONS: { value: InterfaceDirection; key: string }[] = [
  { value: 'in', key: 'if_dir_in' },
  { value: 'out', key: 'if_dir_out' },
  { value: 'both', key: 'if_dir_both' },
]

const inputCls =
  'w-full rounded border border-slate-200 px-1.5 py-1 text-xs outline-none focus:border-cosmo-gold dark:border-slate-600 dark:bg-[#232a37] dark:text-slate-100'

export function InterfacePanel() {
  const { t } = useLang()
  const { state, update } = useStore()
  const { fmt } = useCurrencyView()
  const calc = useMemo(() => calculate(state), [state])
  const params = state.parameters
  const items = state.interfaces ?? []
  const initiateRole = params.roles.find((r) => r.id === params.phaseRole.initiate)

  const hasPlatformLicense = state.environments.some((e) =>
    e.licenses.some((l) => /anyfy/i.test(l.product)),
  )

  function patch(id: string, fn: (it: InterfaceItem) => void) {
    update((d) => {
      const it = d.interfaces.find((x) => x.id === id)
      if (it) fn(it)
    })
  }

  function add() {
    update((d) => {
      d.interfaces.push({
        id: uid('if'),
        name: '',
        source: '',
        target: 'Business Central',
        direction: 'in',
        objects: '',
        technology: 'REST-API',
        platform: DEFAULT_INTEGRATION_PLATFORM,
        complexity: 'medium',
        days: INTERFACE_EFFORT.medium,
        scope: 'in',
      })
    })
  }

  function remove(id: string) {
    update((d) => {
      d.interfaces = d.interfaces.filter((x) => x.id !== id)
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PanelTitle title={t('tab_interfaces')} intro={t('if_intro')} />
        <div className="flex flex-wrap items-center gap-2">
          <CurrencyToggle />
          <button className="cc-btn-gold" onClick={add}>
            ＋ {t('if_add')}
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-cosmo-gold/40 bg-cosmo-gold/10 px-3 py-2 text-xs text-cosmo-gold-dark dark:text-amber-200">
        {t('if_calc_hint')
          .replace('{role}', initiateRole?.name || '—')
          .replace('{rate}', fmt(calc.interfaceRate))}
        {!hasPlatformLicense && <span className="ml-1 font-semibold">{t('if_license_hint')}</span>}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label={t('if_kpi_count')} value={`${calc.interfaceLines.length}`} sub={`/ ${items.length}`} />
        <Kpi label={t('if_kpi_days')} value={`${formatDays(calc.interfaceDays)} ${t('perDay')}`} sub={t('phase_initiate')} />
        <Kpi label={t('if_kpi_cost')} value={fmt(calc.interfaceCost)} gold />
        <Kpi
          label={t('scope_opt_label')}
          value={fmt(calc.optInterfaceCost)}
          sub={`${calc.optInterfaceLines.length} · ${formatDays(calc.optInterfaceDays)} ${t('perDay')}`}
        />
      </div>

      {items.length === 0 ? (
        <div className="cc-card p-8 text-center text-sm text-slate-400">{t('if_empty')}</div>
      ) : (
        <div className="cc-card overflow-x-auto">
          <table className="w-full min-w-[1500px]">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="cc-th">Scope</th>
                <th className="cc-th min-w-[200px]">{t('if_name')}</th>
                <th className="cc-th min-w-[150px]">{t('if_source')}</th>
                <th className="cc-th min-w-[150px]">{t('if_target')}</th>
                <th className="cc-th min-w-[120px]">{t('if_direction')}</th>
                <th className="cc-th min-w-[200px]">{t('if_objects')}</th>
                <th className="cc-th min-w-[130px]">{t('if_technology')}</th>
                <th className="cc-th min-w-[110px]">{t('if_platform')}</th>
                <th className="cc-th text-center">{t('complexity_col')}</th>
                <th className="cc-th text-center">
                  {t('phase_initiate')}
                  <div className="text-[10px] font-normal normal-case text-slate-400">{t('days_pt')}</div>
                </th>
                <th className="cc-th text-right">{t('cost')}</th>
                <th className="cc-th" />
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className="border-b border-slate-50 align-top hover:bg-slate-50/50">
                  <td className="cc-td">
                    <ScopeSegment
                      size="sm"
                      value={it.scope}
                      onChange={(v: ScopeStatus) => patch(it.id, (x) => (x.scope = v))}
                    />
                  </td>
                  <td className="cc-td">
                    <input className={`${inputCls} font-semibold`} value={it.name} onChange={(e) => patch(it.id, (x) => (x.name = e.target.value))} />
                    <input
                      className={`${inputCls} mt-1 text-[11px] text-slate-500`}
                      placeholder={t('if_reqs')}
                      value={it.reqs || ''}
                      onChange={(e) => patch(it.id, (x) => (x.reqs = e.target.value))}
                    />
                  </td>
                  <td className="cc-td">
                    <input className={inputCls} value={it.source} onChange={(e) => patch(it.id, (x) => (x.source = e.target.value))} />
                  </td>
                  <td className="cc-td">
                    <input className={inputCls} value={it.target} onChange={(e) => patch(it.id, (x) => (x.target = e.target.value))} />
                  </td>
                  <td className="cc-td">
                    <select
                      className={inputCls}
                      value={it.direction}
                      onChange={(e) => patch(it.id, (x) => (x.direction = e.target.value as InterfaceDirection))}
                    >
                      {DIRECTIONS.map((d) => (
                        <option key={d.value} value={d.value}>
                          {t(d.key)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="cc-td">
                    <textarea
                      rows={2}
                      className={inputCls}
                      value={it.objects}
                      onChange={(e) => patch(it.id, (x) => (x.objects = e.target.value))}
                    />
                  </td>
                  <td className="cc-td">
                    <input className={inputCls} value={it.technology} onChange={(e) => patch(it.id, (x) => (x.technology = e.target.value))} />
                  </td>
                  <td className="cc-td">
                    <input className={inputCls} value={it.platform} onChange={(e) => patch(it.id, (x) => (x.platform = e.target.value))} />
                  </td>
                  <td className="cc-td text-center">
                    <div className="inline-flex overflow-hidden rounded border border-slate-200 dark:border-slate-600">
                      {COMPLEXITY_KEYS.map((c) => (
                        <button
                          key={c}
                          title={`${t(COMPLEXITY_LABEL[c])} · ${formatDays(INTERFACE_EFFORT[c])} ${t('perDay')}`}
                          onClick={() =>
                            patch(it.id, (x) => {
                              x.complexity = c
                              x.days = INTERFACE_EFFORT[c]
                            })
                          }
                          className={`px-1.5 py-0.5 text-[11px] font-semibold transition-colors ${
                            it.complexity === c ? 'bg-cosmo-gold text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'
                          }`}
                        >
                          {t(COMPLEXITY_LABEL[c]).charAt(0)}
                        </button>
                      ))}
                    </div>
                  </td>
                  <td className="cc-td text-center">
                    <input
                      type="number"
                      min={0}
                      step={0.25}
                      value={it.days || ''}
                      onChange={(e) =>
                        patch(it.id, (x) => {
                          x.days = Math.max(0, parseFloat(e.target.value) || 0)
                          x.complexity = undefined
                        })
                      }
                      className="w-16 rounded border border-slate-200 px-1.5 py-1 text-center text-xs outline-none focus:border-cosmo-gold dark:border-slate-600 dark:bg-[#232a37] dark:text-slate-100"
                    />
                  </td>
                  <td className={`cc-td text-right font-semibold ${it.scope === 'in' ? 'text-cosmo-anthracite' : 'text-slate-400'}`}>
                    {fmt((it.days || 0) * calc.interfaceRate)}
                  </td>
                  <td className="cc-td text-right">
                    <button className="text-xs text-slate-400 hover:text-rose-600" onClick={() => remove(it.id)} title={t('remove')}>
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
              <tr className="bg-slate-50/60 font-bold">
                <td className="cc-td" colSpan={9}>
                  Σ {t('scope_in_label')} ({calc.interfaceLines.length})
                </td>
                <td className="cc-td text-center">{formatDays(calc.interfaceDays)}</td>
                <td className="cc-td text-right text-cosmo-gold">{fmt(calc.interfaceCost)}</td>
                <td className="cc-td" />
              </tr>
            </tbody>
          </table>
        </div>
      )}
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

import { Fragment, useMemo, useState } from 'react'
import { useStore } from '../../lib/store'
import { useLang } from '../../i18n/LanguageContext'
import { formatDays } from '../../lib/calc'
import { useCalc } from '../../lib/calcContext'
import { useCurrencyView } from '../../lib/currencyView'
import { catalogForEnvironment } from '../../lib/mbpcCatalog'
import { CALC_PHASE_KEYS, COMPLEXITY_KEYS } from '../../types'
import type { Complexity, PhaseKey, ScopeStatus } from '../../types'
import { CurrencyToggle } from '../CurrencyToggle'
import { PanelTitle } from './ProspectPanel'

interface DevRow {
  key: string
  envName: string
  procKey: string
  procName: string
  procIcon: string
  area: string
  label: string
  complexity?: Complexity
  scope: ScopeStatus
  phaseDays: Record<PhaseKey, number>
  days: number
  cost: number
}

const COMPLEXITY_LABEL: Record<Complexity, string> = {
  small: 'complexity_small',
  medium: 'complexity_medium',
  complex: 'complexity_complex',
}

const sum = (rows: DevRow[], pick: (r: DevRow) => number) => rows.reduce((s, r) => s + pick(r), 0)

/** Register „Entwicklung": Aufwand und Wert der Positionen, die über Standard hinausgehen, je Prozess, Bereich und Position. */
export function DevelopmentPanel() {
  const { t, lang } = useLang()
  const { state } = useStore()
  const { fmt } = useCurrencyView()
  const calc = useCalc()
  const params = state.parameters
  const [includeOpt, setIncludeOpt] = useState(false)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState<Set<string>>(new Set())

  const rate = (phase: PhaseKey) => params.roles.find((r) => r.id === params.phaseRole[phase])?.rate ?? 0
  const multiEnv = state.environments.length > 1

  const allRows = useMemo(() => {
    const out: DevRow[] = []
    state.environments.forEach((env, i) => {
      const ec = calc.perEnvironment[i]
      if (!ec) return
      const catalog = catalogForEnvironment(env)
      const add = (features: typeof ec.scope.features) => {
        for (const f of features) {
          if (f.standard) continue
          const proc = catalog.find((p) => p.id === f.processId)
          const area = proc?.areas[f.areaIdx]
          out.push({
            key: `${env.id}::${f.processId}::${f.areaIdx}::${f.stepIdx}`,
            envName: env.name,
            procKey: `${env.id}::${f.processId}`,
            procName: proc ? (lang === 'de' ? proc.nameDE : proc.nameEN) : f.processId,
            procIcon: proc?.icon ?? '',
            area: area ? (lang === 'de' ? area.t : area.en || area.t) : '',
            label: lang === 'de' ? f.label : area?.stepsEN?.[f.stepIdx] || f.label,
            complexity: f.complexity,
            scope: f.scope,
            phaseDays: f.phaseDays,
            days: f.days,
            cost: f.cost,
          })
        }
      }
      add(ec.scope.features)
      add(ec.scope.optFeatures)
    })
    return out
  }, [state.environments, calc, lang])

  const inRows = allRows.filter((r) => r.scope === 'in')
  const optRows = allRows.filter((r) => r.scope === 'opt')
  const baseRows = includeOpt ? allRows : inRows

  const q = query.trim().toLowerCase()
  const rows = q ? baseRows.filter((r) => `${r.procName} ${r.area} ${r.label}`.toLowerCase().includes(q)) : baseRows

  const totalDays = sum(baseRows, (r) => r.days)
  const totalCost = sum(baseRows, (r) => r.cost)
  const inDays = sum(inRows, (r) => r.days)
  const share = calc.featureDays > 0 ? (inDays / calc.featureDays) * 100 : 0

  const groups = useMemo(() => {
    const map = new Map<string, DevRow[]>()
    for (const r of rows) {
      const list = map.get(r.procKey) ?? []
      list.push(r)
      map.set(r.procKey, list)
    }
    return [...map.entries()]
      .map(([key, list]) => ({
        key,
        list: [...list].sort((a, b) => b.days - a.days),
        days: sum(list, (r) => r.days),
        cost: sum(list, (r) => r.cost),
      }))
      .sort((a, b) => b.cost - a.cost)
  }, [rows])

  function toggle(key: string) {
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const pct = (v: number, of: number) => (of > 0 ? `${Math.round((v / of) * 100)} %` : '–')

  function exportCsv() {
    const num = (v: number) => v.toFixed(2).replace('.', ',')
    const cell = (v: string) => {
      const s = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v
      return `"${s.replace(/"/g, '""')}"`
    }
    const head = [
      ...(multiEnv ? ['Environment'] : []),
      'Prozess',
      'Bereich',
      'Position',
      'Vorlage',
      'Scope',
      ...CALC_PHASE_KEYS.map((p) => `PT ${t('phase_' + p)}`),
      'PT gesamt',
      'Wert',
    ]
    const lines = rows.map((r) =>
      [
        ...(multiEnv ? [r.envName] : []),
        r.procName,
        r.area,
        r.label,
        r.complexity ? t(COMPLEXITY_LABEL[r.complexity]) : '',
        r.scope === 'opt' ? 'Opt' : 'In',
        ...CALC_PHASE_KEYS.map((p) => num(r.phaseDays[p] || 0)),
        num(r.days),
        num(r.cost),
      ].map((v) => (typeof v === 'string' ? cell(v) : String(v))),
    )
    const csv = '\ufeff' + [head.map(cell), ...lines].map((l) => l.join(';')).join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `entwicklungsleistungen_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const phaseRows = CALC_PHASE_KEYS.map((p) => {
    const days = sum(baseRows, (r) => r.phaseDays[p] || 0)
    return { p, days, cost: days * rate(p) }
  })
  const complexityRows = [...COMPLEXITY_KEYS, undefined].map((c) => {
    const list = baseRows.filter((r) => r.complexity === c)
    return { c, n: list.length, days: sum(list, (r) => r.days), cost: sum(list, (r) => r.cost) }
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PanelTitle title={t('tab_development')} intro={t('dev_intro')} />
        <div className="flex flex-wrap items-center gap-2">
          <CurrencyToggle />
          <button className="cc-btn-ghost" onClick={exportCsv} disabled={rows.length === 0}>
            ⭳ {t('dev_csv')}
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-cosmo-gold/40 bg-cosmo-gold/10 px-3 py-2 text-xs text-cosmo-gold-dark dark:text-amber-200">
        {t('dev_hint')}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          label={t('dev_kpi_count')}
          value={`${baseRows.length}`}
          sub={optRows.length && !includeOpt ? `+ ${optRows.length} ${t('scope_opt_label')}` : undefined}
        />
        <Kpi label={t('dev_kpi_days')} value={`${formatDays(totalDays)} ${t('perDay')}`} />
        <Kpi label={t('dev_kpi_cost')} value={fmt(totalCost)} gold />
        <Kpi
          label={t('dev_kpi_share')}
          value={`${share.toFixed(0)} %`}
          sub={t('dev_of_total').replace('{n}', formatDays(calc.featureDays))}
        />
      </div>

      <div className="text-xs text-slate-500">
        {t('dev_interfaces_note')}: <b>{formatDays(calc.interfaceDays)} {t('perDay')}</b> · <b>{fmt(calc.interfaceCost)}</b>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="cc-card overflow-x-auto">
          <div className="px-3 pt-3 text-sm font-bold text-cosmo-anthracite">{t('dev_by_phase')}</div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="cc-th">SbD</th>
                <th className="cc-th text-right">{t('dev_col_total')}</th>
                <th className="cc-th text-right">{t('dev_col_value')}</th>
                <th className="cc-th text-right">{t('dev_col_share')}</th>
              </tr>
            </thead>
            <tbody>
              {phaseRows.map((r) => (
                <tr key={r.p} className="border-b border-slate-50">
                  <td className="cc-td">{t('phase_' + r.p)}</td>
                  <td className="cc-td text-right">{formatDays(r.days)}</td>
                  <td className="cc-td text-right">{fmt(r.cost)}</td>
                  <td className="cc-td text-right">{pct(r.days, totalDays)}</td>
                </tr>
              ))}
              <tr className="font-bold">
                <td className="cc-td">Σ</td>
                <td className="cc-td text-right">{formatDays(totalDays)}</td>
                <td className="cc-td text-right">{fmt(totalCost)}</td>
                <td className="cc-td text-right">{totalDays > 0 ? '100 %' : '–'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="cc-card overflow-x-auto">
          <div className="px-3 pt-3 text-sm font-bold text-cosmo-anthracite">{t('dev_by_complexity')}</div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="cc-th">{t('complexity_col')}</th>
                <th className="cc-th text-right">{t('dev_col_positions')}</th>
                <th className="cc-th text-right">{t('dev_col_total')}</th>
                <th className="cc-th text-right">{t('dev_col_value')}</th>
              </tr>
            </thead>
            <tbody>
              {complexityRows
                .filter((r) => r.n > 0)
                .map((r) => (
                  <tr key={r.c ?? 'none'} className="border-b border-slate-50">
                    <td className="cc-td">{r.c ? t(COMPLEXITY_LABEL[r.c]) : t('dev_no_template')}</td>
                    <td className="cc-td text-right">{r.n}</td>
                    <td className="cc-td text-right">{formatDays(r.days)}</td>
                    <td className="cc-td text-right">{fmt(r.cost)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          className="cc-input max-w-sm"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('dev_search')}
          aria-label={t('dev_search')}
        />
        <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <input type="checkbox" checked={includeOpt} onChange={(e) => setIncludeOpt(e.target.checked)} />
          {t('dev_incl_opt')}
        </label>
        <button className="cc-btn-ghost" onClick={() => setOpen(new Set(groups.map((g) => g.key)))}>
          {t('dev_expand_all')}
        </button>
        <button className="cc-btn-ghost" onClick={() => setOpen(new Set())}>
          {t('dev_collapse_all')}
        </button>
      </div>

      {groups.length === 0 ? (
        <div className="cc-card p-8 text-center text-sm text-slate-400">{t('dev_none')}</div>
      ) : (
        <div className="cc-card overflow-x-auto">
          <div className="px-3 pt-3 text-sm font-bold text-cosmo-anthracite">{t('dev_by_process')}</div>
          <table className="w-full min-w-[1000px]">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="cc-th min-w-[320px]">{t('dev_col_process')}</th>
                <th className="cc-th text-center">{t('complexity_col')}</th>
                {CALC_PHASE_KEYS.map((p) => (
                  <th key={p} className="cc-th text-right">
                    {t('phase_' + p)}
                  </th>
                ))}
                <th className="cc-th text-right">{t('dev_col_total')}</th>
                <th className="cc-th text-right">{t('dev_col_value')}</th>
                <th className="cc-th text-right">{t('dev_col_share')}</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => {
                const isOpen = open.has(g.key)
                const head = g.list[0]
                return (
                  <Fragment key={g.key}>
                    <tr
                      className="cursor-pointer border-b border-slate-100 bg-slate-50 font-semibold hover:bg-slate-100 dark:bg-[#232a37]"
                      onClick={() => toggle(g.key)}
                    >
                      <td className="cc-td">
                        <button
                          className="mr-2 text-slate-400"
                          aria-expanded={isOpen}
                          aria-label={head.procName}
                          onClick={(e) => {
                            e.stopPropagation()
                            toggle(g.key)
                          }}
                        >
                          {isOpen ? '▾' : '▸'}
                        </button>
                        {head.procIcon} {head.procName}
                        {multiEnv && <span className="ml-2 text-xs font-normal text-slate-400">{head.envName}</span>}
                        <span className="ml-2 text-xs font-normal text-slate-400">
                          {g.list.length} {t('dev_col_positions')}
                        </span>
                      </td>
                      <td className="cc-td" />
                      {CALC_PHASE_KEYS.map((p) => (
                        <td key={p} className="cc-td text-right">
                          {formatDays(sum(g.list, (r) => r.phaseDays[p] || 0))}
                        </td>
                      ))}
                      <td className="cc-td text-right">{formatDays(g.days)}</td>
                      <td className="cc-td text-right">{fmt(g.cost)}</td>
                      <td className="cc-td text-right">{pct(g.cost, sum(rows, (r) => r.cost))}</td>
                    </tr>
                    {isOpen &&
                      g.list.map((r) => (
                        <tr key={r.key} className="border-b border-slate-50 align-top hover:bg-slate-50/50">
                          <td className="cc-td pl-9">
                            <div>
                              {r.label}
                              {r.scope === 'opt' && (
                                <span className="scope-opt ml-2 rounded px-1.5 py-0.5 text-[10px] font-semibold">
                                  {t('scope_opt_label')}
                                </span>
                              )}
                            </div>
                            {r.area && <div className="text-xs text-slate-400">{r.area}</div>}
                          </td>
                          <td className="cc-td text-center text-xs">{r.complexity ? t(COMPLEXITY_LABEL[r.complexity]) : '–'}</td>
                          {CALC_PHASE_KEYS.map((p) => (
                            <td key={p} className="cc-td text-right">
                              {r.phaseDays[p] ? formatDays(r.phaseDays[p]) : '–'}
                            </td>
                          ))}
                          <td className="cc-td text-right">{formatDays(r.days)}</td>
                          <td className="cc-td text-right">{fmt(r.cost)}</td>
                          <td className="cc-td text-right">{pct(r.cost, sum(rows, (x) => x.cost))}</td>
                        </tr>
                      ))}
                  </Fragment>
                )
              })}
              <tr className="border-t-2 border-slate-200 font-bold">
                <td className="cc-td">Σ</td>
                <td className="cc-td" />
                {CALC_PHASE_KEYS.map((p) => (
                  <td key={p} className="cc-td text-right">
                    {formatDays(sum(rows, (r) => r.phaseDays[p] || 0))}
                  </td>
                ))}
                <td className="cc-td text-right">{formatDays(sum(rows, (r) => r.days))}</td>
                <td className="cc-td text-right">{fmt(sum(rows, (r) => r.cost))}</td>
                <td className="cc-td text-right">{rows.length ? '100 %' : '–'}</td>
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

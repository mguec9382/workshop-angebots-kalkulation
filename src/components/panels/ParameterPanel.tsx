import { useStore } from '../../lib/store'
import { useLang } from '../../i18n/LanguageContext'
import { CALC_PHASE_KEYS } from '../../types'
import type { Industry, OverheadRole, PhaseKey } from '../../types'
import { ARCHETYPES, CATALOG, INDUSTRIES } from '../../data/catalog'
import { PanelTitle } from './ProspectPanel'

const PHASE_LABEL: Record<PhaseKey, string> = {
  strategize: 'phase_strategize',
  initiate: 'phase_initiate',
  build: 'phase_build',
  prepare: 'phase_prepare',
  operate: 'phase_operate',
}

let seq = 0
const uid = (p: string) => `${p}-${Date.now().toString(36)}${(seq++).toString(36)}`

export function ParameterPanel() {
  const { t, lang } = useLang()
  const { state, update } = useStore()
  const params = state.parameters
  const customIndustries = params.customIndustries ?? []

  /** effektives Overlay einer Standard-Branche (Override oder Katalog-Default) */
  function stdOverlay(ind: Industry): string[] {
    return params.industryOverlays?.[ind.id] ?? ind.overlay
  }
  function toggleStdOverlay(ind: Industry, procId: string) {
    update((d) => {
      if (!d.parameters.industryOverlays) d.parameters.industryOverlays = {}
      const cur = [...(d.parameters.industryOverlays[ind.id] ?? ind.overlay)]
      const idx = cur.indexOf(procId)
      if (idx >= 0) cur.splice(idx, 1)
      else cur.push(procId)
      d.parameters.industryOverlays[ind.id] = cur
    })
  }
  function toggleCustomOverlay(i: number, procId: string) {
    update((d) => {
      const arr = d.parameters.customIndustries[i].overlay
      const idx = arr.indexOf(procId)
      if (idx >= 0) arr.splice(idx, 1)
      else arr.push(procId)
    })
  }

  return (
    <div className="space-y-4">
      <PanelTitle title={t('tab_parameters')} intro={t('param_intro')} />

      {/* Grunddaten */}
      <div className="cc-card p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="cc-label">{t('currency')}</span>
            <select
              className="cc-input"
              value={params.currency}
              onChange={(e) => update((d) => (d.parameters.currency = e.target.value))}
            >
              <option value="EUR">EUR</option>
              <option value="CHF">CHF</option>
              <option value="USD">USD</option>
            </select>
          </label>
          <label className="block">
            <span className="cc-label">{t('hoursPerDay')}</span>
            <input
              type="number"
              className="cc-input"
              value={params.hoursPerDay}
              onChange={(e) => update((d) => (d.parameters.hoursPerDay = parseFloat(e.target.value) || 8))}
            />
          </label>
          <label className="block">
            <span className="cc-label">{t('unit_toggle')}</span>
            <select
              className="cc-input"
              value={params.unit}
              onChange={(e) => update((d) => (d.parameters.unit = e.target.value as 'days' | 'hours'))}
            >
              <option value="days">{t('days')}</option>
              <option value="hours">{t('hours')}</option>
            </select>
          </label>
        </div>
      </div>

      {/* Rollen & Tagessätze */}
      <div className="cc-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-4 py-2">
          <span className="font-bold text-cosmo-anthracite">{t('roles')}</span>
          <button
            className="cc-btn-ghost"
            onClick={() =>
              update((d) => d.parameters.roles.push({ id: uid('role'), name: t('new_role'), rate: 1000 }))
            }
          >
            ＋ {t('add')}
          </button>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="cc-th">{t('role')}</th>
              <th className="cc-th w-40 text-right">{t('rate')} ({params.currency})</th>
              <th className="cc-th w-16"></th>
            </tr>
          </thead>
          <tbody>
            {params.roles.map((r, i) => (
              <tr key={r.id} className="border-b border-slate-50">
                <td className="cc-td">
                  <input
                    className="w-full rounded border border-transparent px-2 py-1 hover:border-slate-200 focus:border-cosmo-gold focus:outline-none dark:bg-transparent dark:text-slate-100 dark:hover:border-slate-600"
                    value={r.name}
                    onChange={(e) => update((d) => (d.parameters.roles[i].name = e.target.value))}
                  />
                </td>
                <td className="cc-td text-right">
                  <input
                    type="number"
                    className="w-28 rounded border border-slate-200 px-2 py-1 text-right focus:border-cosmo-gold focus:outline-none dark:border-slate-600 dark:bg-[#232a37] dark:text-slate-100"
                    value={r.rate}
                    onChange={(e) => update((d) => (d.parameters.roles[i].rate = parseFloat(e.target.value) || 0))}
                  />
                </td>
                <td className="cc-td text-center">
                  <button
                    className="text-slate-300 hover:text-rose-500"
                    onClick={() => update((d) => d.parameters.roles.splice(i, 1))}
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Rolle je Phase */}
      <div className="cc-card p-5">
        <div className="mb-3 font-bold text-cosmo-anthracite">{t('phase_roles')}</div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {CALC_PHASE_KEYS.map((ph) => (
            <label key={ph} className="block">
              <span className="cc-label">{t(PHASE_LABEL[ph])}</span>
              <select
                className="cc-input"
                value={params.phaseRole[ph]}
                onChange={(e) => update((d) => (d.parameters.phaseRole[ph] = e.target.value))}
              >
                {params.roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      </div>

      {/* Overhead */}
      <div className="cc-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-4 py-2">
          <span className="font-bold text-cosmo-anthracite">{t('overhead')}</span>
          <button
            className="cc-btn-ghost"
            onClick={() =>
              update((d) =>
                d.parameters.overhead.push({
                  id: uid('oh'),
                  name: t('new_role'),
                  mode: 'percent',
                  value: 5,
                  rate: 1400,
                  crossCountryOnly: false,
                  active: true,
                }),
              )
            }
          >
            ＋ {t('add')}
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="cc-th">{t('role')}</th>
                <th className="cc-th w-32">{t('mode')}</th>
                <th className="cc-th w-24 text-right">{t('value')}</th>
                <th className="cc-th w-32 text-right">{t('rate')}</th>
                <th className="cc-th w-40 text-center">{t('crossCountry')}</th>
                <th className="cc-th w-20 text-center">{t('active')}</th>
                <th className="cc-th w-12"></th>
              </tr>
            </thead>
            <tbody>
              {params.overhead.map((oh, i) => (
                <OverheadRow key={oh.id} oh={oh} onChange={(fn) => update((d) => fn(d.parameters.overhead[i]))} onRemove={() => update((d) => d.parameters.overhead.splice(i, 1))} t={t} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Branchen (COSMO CONSULT) */}
      <div className="cc-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-4 py-2">
          <span className="font-bold text-cosmo-anthracite">{t('industries')}</span>
          <button
            className="cc-btn-ghost"
            onClick={() =>
              update((d) => {
                if (!d.parameters.customIndustries) d.parameters.customIndustries = []
                d.parameters.customIndustries.push({
                  id: uid('ind'),
                  label: t('new_industry'),
                  labelEN: 'New industry',
                  overlay: [],
                  archetypeId: 'all',
                  custom: true,
                })
              })
            }
          >
            ＋ {t('add')}
          </button>
        </div>

        <div className="px-4 py-3 text-sm text-slate-500">
          {t('industries_hint')}
          <div className="mt-1 text-xs text-slate-400">{t('overlay_hint')}</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px]">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="cc-th w-52">{t('industry_de')}</th>
                <th className="cc-th w-52">{t('industry_en')}</th>
                <th className="cc-th w-48">{t('archetype')}</th>
                <th className="cc-th">{t('process_overlay')}</th>
                <th className="cc-th w-12"></th>
              </tr>
            </thead>
            <tbody>
              {/* Standard-Branchen (Bezeichnung/Archetyp fix, Overlay anpassbar) */}
              {INDUSTRIES.map((ind) => {
                const arch = ARCHETYPES.find((a) => a.id === ind.archetypeId)
                return (
                  <tr key={ind.id} className="border-b border-slate-50 align-top">
                    <td className="cc-td">
                      <span className="font-medium text-cosmo-anthracite dark:text-slate-100">
                        {lang === 'de' ? ind.label : ind.labelEN}
                      </span>
                      <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
                        {t('std_tag')}
                      </span>
                    </td>
                    <td className="cc-td text-slate-500">{ind.labelEN}</td>
                    <td className="cc-td text-slate-500">
                      {arch ? `${arch.icon} ${lang === 'de' ? arch.label : arch.labelEN}` : '—'}
                    </td>
                    <td className="cc-td">
                      <OverlayChips selected={stdOverlay(ind)} onToggle={(pid) => toggleStdOverlay(ind, pid)} lang={lang} />
                    </td>
                    <td className="cc-td"></td>
                  </tr>
                )
              })}

              {/* Benutzerdefinierte Branchen (vollständig editierbar) */}
              {customIndustries.map((ind, i) => (
                <tr key={ind.id} className="border-b border-slate-50 bg-cosmo-gold/5 align-top">
                  <td className="cc-td">
                    <input
                      className="w-full rounded border border-transparent px-2 py-1 hover:border-slate-200 focus:border-cosmo-gold focus:outline-none dark:bg-transparent dark:text-slate-100 dark:hover:border-slate-600"
                      value={ind.label}
                      onChange={(e) => update((d) => (d.parameters.customIndustries[i].label = e.target.value))}
                    />
                  </td>
                  <td className="cc-td">
                    <input
                      className="w-full rounded border border-transparent px-2 py-1 hover:border-slate-200 focus:border-cosmo-gold focus:outline-none dark:bg-transparent dark:text-slate-100 dark:hover:border-slate-600"
                      value={ind.labelEN}
                      onChange={(e) => update((d) => (d.parameters.customIndustries[i].labelEN = e.target.value))}
                    />
                  </td>
                  <td className="cc-td">
                    <select
                      className="cc-input"
                      value={ind.archetypeId || 'all'}
                      onChange={(e) => update((d) => (d.parameters.customIndustries[i].archetypeId = e.target.value))}
                    >
                      {ARCHETYPES.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.icon} {lang === 'de' ? a.label : a.labelEN}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="cc-td">
                    <OverlayChips selected={ind.overlay} onToggle={(pid) => toggleCustomOverlay(i, pid)} lang={lang} />
                  </td>
                  <td className="cc-td text-center">
                    <button
                      className="text-slate-300 hover:text-rose-500"
                      onClick={() => update((d) => d.parameters.customIndustries.splice(i, 1))}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
              {customIndustries.length === 0 && (
                <tr>
                  <td className="cc-td text-slate-400" colSpan={5}>
                    {t('no_custom_industries')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function OverlayChips({
  selected,
  onToggle,
  lang,
}: {
  selected: string[]
  onToggle: (procId: string) => void
  lang: 'de' | 'en'
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {CATALOG.map((proc) => {
        const on = selected.includes(proc.id)
        return (
          <button
            key={proc.id}
            type="button"
            onClick={() => onToggle(proc.id)}
            title={lang === 'de' ? proc.nameDE : proc.nameEN}
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] transition-colors ${
              on
                ? 'border-cosmo-gold bg-cosmo-gold/10 text-cosmo-anthracite dark:text-slate-100'
                : 'border-slate-200 text-slate-400 hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-700/40'
            }`}
          >
            <span>{proc.icon}</span>
            <span className="max-w-[130px] truncate">{lang === 'de' ? proc.nameDE : proc.nameEN}</span>
          </button>
        )
      })}
    </div>
  )
}

function OverheadRow({
  oh,
  onChange,
  onRemove,
  t,
}: {
  oh: OverheadRole
  onChange: (fn: (o: OverheadRole) => void) => void
  onRemove: () => void
  t: (k: string) => string
}) {
  return (
    <tr className="border-b border-slate-50">
      <td className="cc-td">
        <input
          className="w-full rounded border border-transparent px-2 py-1 hover:border-slate-200 focus:border-cosmo-gold focus:outline-none dark:bg-transparent dark:text-slate-100 dark:hover:border-slate-600"
          value={oh.name}
          onChange={(e) => onChange((o) => (o.name = e.target.value))}
        />
      </td>
      <td className="cc-td">
        <select
          className="w-full rounded border border-slate-200 px-2 py-1 focus:border-cosmo-gold focus:outline-none dark:border-slate-600 dark:bg-[#232a37] dark:text-slate-100"
          value={oh.mode}
          onChange={(e) => onChange((o) => (o.mode = e.target.value as 'percent' | 'days'))}
        >
          <option value="percent">{t('percent')}</option>
          <option value="days">{t('fixedDays')}</option>
        </select>
      </td>
      <td className="cc-td text-right">
        <input
          type="number"
          className="w-20 rounded border border-slate-200 px-2 py-1 text-right focus:border-cosmo-gold focus:outline-none dark:border-slate-600 dark:bg-[#232a37] dark:text-slate-100"
          value={oh.value}
          onChange={(e) => onChange((o) => (o.value = parseFloat(e.target.value) || 0))}
        />
        <span className="ml-1 text-xs text-slate-400">{oh.mode === 'percent' ? '%' : t('days')}</span>
      </td>
      <td className="cc-td text-right">
        <input
          type="number"
          className="w-24 rounded border border-slate-200 px-2 py-1 text-right focus:border-cosmo-gold focus:outline-none dark:border-slate-600 dark:bg-[#232a37] dark:text-slate-100"
          value={oh.rate}
          onChange={(e) => onChange((o) => (o.rate = parseFloat(e.target.value) || 0))}
        />
      </td>
      <td className="cc-td text-center">
        <input
          type="checkbox"
          checked={oh.crossCountryOnly}
          onChange={(e) => onChange((o) => (o.crossCountryOnly = e.target.checked))}
        />
      </td>
      <td className="cc-td text-center">
        <input type="checkbox" checked={oh.active} onChange={(e) => onChange((o) => (o.active = e.target.checked))} />
      </td>
      <td className="cc-td text-center">
        <button className="text-slate-300 hover:text-rose-500" onClick={onRemove}>
          ✕
        </button>
      </td>
    </tr>
  )
}

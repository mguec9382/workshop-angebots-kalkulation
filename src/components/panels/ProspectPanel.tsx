import { useStore } from '../../lib/store'
import { useLang } from '../../i18n/LanguageContext'
import { ARCHETYPES, CATALOG, INDUSTRIES, archetypeById, industryOverlay } from '../../data/catalog'

export function ProspectPanel({ onNext }: { onNext: () => void }) {
  const { t, lang } = useLang()
  const { state, update } = useStore()
  const p = state.prospect
  const allIndustries = [...INDUSTRIES, ...(state.parameters.customIndustries ?? [])]

  function set<K extends keyof typeof p>(key: K, value: (typeof p)[K]) {
    update((d) => {
      d.prospect[key] = value
    })
  }

  function selectIndustry(id: string) {
    update((d) => {
      d.prospect.industryId = id
      const ind = allIndustries.find((i) => i.id === id)
      if (ind?.archetypeId) d.prospect.archetypeId = ind.archetypeId
    })
  }

  function applyPreset() {
    const arch = archetypeById(p.archetypeId)
    update((d) => {
      const relevant = arch.procs
      const e = d.environments.find((x) => x.id === d.activeEnvironmentId) || d.environments[0]
      if (!e) return
      e.archetypeId = p.archetypeId
      for (const proc of CATALOG) {
        if (!relevant) e.scope.proc[proc.id] = 'in'
        else e.scope.proc[proc.id] = relevant.includes(proc.id) ? 'in' : 'out'
      }
      // Branchen-Overlay: branchenrelevante Prozesse zusätzlich in den Scope nehmen
      const overlay = industryOverlay(p.industryId, d.parameters.customIndustries ?? [], d.parameters.industryOverlays ?? {})
      for (const pid of overlay) e.scope.proc[pid] = 'in'
    })
  }

  return (
    <div className="space-y-4">
      <PanelTitle title={t('tab_prospect')} intro={t('prospect_intro')} />

      <div className="cc-card p-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label={t('company')}>
            <input className="cc-input" value={p.company} onChange={(e) => set('company', e.target.value)} />
          </Field>
          <Field label={t('contact')}>
            <input className="cc-input" value={p.contact} onChange={(e) => set('contact', e.target.value)} />
          </Field>

          <Field label={t('industry')}>
            <select className="cc-input" value={p.industryId} onChange={(e) => selectIndustry(e.target.value)}>
              {allIndustries.map((i) => (
                <option key={i.id} value={i.id}>
                  {lang === 'de' ? i.label : i.labelEN}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('archetype')}>
            <select className="cc-input" value={p.archetypeId} onChange={(e) => set('archetypeId', e.target.value)}>
              {ARCHETYPES.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.icon} {lang === 'de' ? a.label : a.labelEN}
                </option>
              ))}
            </select>
          </Field>

          <Field label={t('size')}>
            <input className="cc-input" value={p.size} onChange={(e) => set('size', e.target.value)} />
          </Field>
          <Field label={t('country')}>
            <input className="cc-input" value={p.country} onChange={(e) => set('country', e.target.value)} />
          </Field>

          <Field label={t('projectStart')}>
            <input type="date" className="cc-input" value={p.projectStart} onChange={(e) => set('projectStart', e.target.value)} />
          </Field>
          <Field label={t('goLive')}>
            <input type="date" className="cc-input" value={p.goLive} onChange={(e) => set('goLive', e.target.value)} />
          </Field>
        </div>

        <Field label={t('notes')} className="mt-4">
          <textarea className="cc-input min-h-[90px]" value={p.notes} onChange={(e) => set('notes', e.target.value)} />
        </Field>

        <div className="mt-4 rounded-lg bg-cosmo-anthracite/5 p-3 text-sm text-slate-600">
          <b>{archetypeById(p.archetypeId).icon} {lang === 'de' ? archetypeById(p.archetypeId).label : archetypeById(p.archetypeId).labelEN}:</b>{' '}
          {lang === 'de' ? archetypeById(p.archetypeId).desc : archetypeById(p.archetypeId).descEN}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button className="cc-btn-ghost" onClick={applyPreset}>
            🗺️ {t('apply_preset')}
          </button>
          <button className="cc-btn-gold" onClick={onNext}>
            → {t('tab_environments')}
          </button>
        </div>
      </div>
    </div>
  )
}

export function PanelTitle({ title, intro }: { title: string; intro: string }) {
  return (
    <div>
      <h1 className="text-xl font-bold text-cosmo-anthracite">{title}</h1>
      <p className="mt-1 max-w-3xl text-sm text-slate-500">{intro}</p>
    </div>
  )
}

export function Field({
  label,
  children,
  className,
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <label className={`block ${className || ''}`}>
      <span className="cc-label">{label}</span>
      {children}
    </label>
  )
}

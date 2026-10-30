import { useMemo, useState } from 'react'
import { useStore } from '../lib/store'
import { useLang } from '../i18n/LanguageContext'
import { catalogForEnvironment } from '../lib/mbpcCatalog'
import { applyRequirement, coverageFor, listPackages, unapplyRequirement } from '../lib/requirementsAgent'
import type { Environment, Requirement, RequirementMatch } from '../types'

type Filter = 'all' | 'pending' | 'accepted' | 'gap'

const COV_CLASS = { fit: 'sc-in', partial: 'sc-opt', gap: 'sc-out' } as const
const FULL = '__all__'

/** Prüft/bearbeitet die Anforderungen eines Environments (Register Environments und MBPC-Workshop). */
export function RequirementsTable({ envId }: { envId: string }) {
  const { t, lang } = useLang()
  const { state, update } = useStore()
  const [filter, setFilter] = useState<Filter>('all')

  const env = state.environments.find((e) => e.id === envId)
  const packages = useMemo(() => listPackages(catalogForEnvironment(env), lang), [env, lang])
  const reqs = env?.requirements ?? []

  if (!env || !reqs.length) return null

  /** Ändert eine Anforderung; bereits übernommene werden im Scope konsistent nachgeführt. */
  function mutate(id: string, fn: (r: Requirement, e: Environment) => void) {
    update((d) => {
      const e = d.environments.find((x) => x.id === envId)
      const r = e?.requirements?.find((x) => x.id === id)
      if (!e || !r) return
      const cat = catalogForEnvironment(e)
      if (r.decision === 'accepted') unapplyRequirement(e, r)
      fn(r, e)
      if (r.decision === 'accepted' && !applyRequirement(e, r, cat)) r.decision = 'pending'
    })
  }

  const counts = {
    all: reqs.length,
    pending: reqs.filter((r) => r.decision === 'pending').length,
    accepted: reqs.filter((r) => r.decision === 'accepted').length,
    gap: reqs.filter((r) => r.coverage === 'gap').length,
  }
  const visible = reqs.filter(
    (r) =>
      filter === 'all' ||
      (filter === 'gap' ? r.coverage === 'gap' : r.decision === filter),
  )

  const filterLabel: Record<Filter, string> = {
    all: t('req_filter_all'),
    pending: t('req_dec_pending'),
    accepted: t('req_dec_accepted'),
    gap: t('req_cov_gap'),
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {(Object.keys(filterLabel) as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
              filter === f
                ? 'border-cosmo-gold bg-cosmo-gold/15 text-cosmo-anthracite dark:text-slate-100'
                : 'border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-white/5'
            }`}
          >
            {filterLabel[f]} <span className="text-slate-400">{counts[f]}</span>
          </button>
        ))}
        <span className="text-[11px] text-slate-400">{t('req_gap_hint')}</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-700">
              <th className="cc-th w-28">Ref</th>
              <th className="cc-th">{t('tab_prospect')} · {t('req_total')}</th>
              <th className="cc-th w-72">{t('req_assign')}</th>
              <th className="cc-th w-28">{t('req_cov_fit')}</th>
              <th className="cc-th w-40">Parrot</th>
              <th className="cc-th w-36"></th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <Row
                key={r.id}
                req={r}
                packages={packages}
                onChange={(fn) => mutate(r.id, fn)}
                onRemove={() =>
                  update((d) => {
                    const e = d.environments.find((x) => x.id === envId)
                    const i = e?.requirements?.findIndex((x) => x.id === r.id) ?? -1
                    if (!e || i < 0) return
                    if (e.requirements![i].decision === 'accepted') unapplyRequirement(e, e.requirements![i])
                    e.requirements!.splice(i, 1)
                  })
                }
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Row({
  req,
  packages,
  onChange,
  onRemove,
}: {
  req: Requirement
  packages: ReturnType<typeof listPackages>
  onChange: (fn: (r: Requirement, e: Environment) => void) => void
  onRemove: () => void
}) {
  const { t } = useLang()
  const [full, setFull] = useState(false)
  const assignedKey = req.assigned ? `${req.assigned.processId}::${req.assigned.areaIdx}::${req.assigned.stepIdx}` : ''
  const keyOf = (m: RequirementMatch) => `${m.processId}::${m.areaIdx}::${m.stepIdx}`

  function assign(value: string) {
    if (value === FULL) {
      setFull(true)
      return
    }
    onChange((r) => {
      if (!value) {
        r.assigned = undefined
        r.coverage = 'gap'
        return
      }
      const sug = r.suggestions.find((s) => keyOf(s) === value)
      const pkg = packages.find((p) => p.value === value)
      const m = sug ?? (pkg ? { ...pkg.match, score: 0 } : undefined)
      if (!m) return
      r.assigned = m
      if (r.coverage === 'gap') r.coverage = sug ? coverageFor(sug.score) : 'partial'
    })
  }

  const groups = useMemo(() => {
    const g = new Map<string, typeof packages>()
    packages.forEach((p) => g.set(p.group, [...(g.get(p.group) ?? []), p]))
    return [...g.entries()]
  }, [packages])

  const p = req.parrot
  const parrotLabel = !p
    ? t('req_parrot_open')
    : p.state === 'checked'
      ? t('req_parrot_ok')
      : p.state === 'nohit'
        ? t('req_parrot_nohit')
        : t('req_parrot_error')
  const parrotClass = !p ? 'sc-unset' : p.state === 'checked' ? 'sc-in' : p.state === 'nohit' ? 'sc-opt' : 'sc-out'

  return (
    <tr className={`border-b border-slate-50 align-top dark:border-slate-800 ${req.decision === 'rejected' ? 'opacity-50' : ''}`}>
      <td className="cc-td">
        <div className="font-semibold text-cosmo-anthracite dark:text-slate-100">{req.ref}</div>
        {req.priority && <div className="text-[10px] text-slate-400">{t('req_priority')}: {req.priority}</div>}
        <div className="truncate text-[10px] text-slate-400" title={req.source}>
          {req.source}
        </div>
      </td>
      <td className="cc-td">
        <textarea
          className="cc-input w-full resize-y text-xs"
          rows={2}
          value={req.text}
          onChange={(e) => onChange((r) => (r.text = e.target.value))}
        />
        <input
          className="mt-1 w-full rounded border border-transparent px-2 py-1 text-xs text-slate-500 hover:border-slate-200 focus:border-cosmo-gold focus:outline-none dark:bg-transparent dark:hover:border-slate-600"
          placeholder={t('req_note')}
          value={req.note ?? ''}
          onChange={(e) => onChange((r) => (r.note = e.target.value))}
        />
      </td>
      <td className="cc-td">
        <select className="cc-input text-xs" value={assignedKey} onChange={(e) => assign(e.target.value)}>
          <option value="">{t('req_unassigned')}</option>
          {full ? (
            groups.map(([g, list]) => (
              <optgroup key={g} label={g}>
                {list.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </optgroup>
            ))
          ) : (
            <>
              {req.assigned && !req.suggestions.some((s) => keyOf(s) === assignedKey) && (
                <option value={assignedKey}>{req.assigned.label}</option>
              )}
              {req.suggestions.map((s) => (
                <option key={keyOf(s)} value={keyOf(s)}>
                  {Math.round(s.score * 100)} % · {s.label}
                </option>
              ))}
              <option value={FULL}>⋯ {t('req_assign')}</option>
            </>
          )}
        </select>
        {req.assigned && (
          <div className="mt-0.5 text-[10px] text-slate-400">
            {t('req_score')}: {Math.round(req.assigned.score * 100)} %
          </div>
        )}
      </td>
      <td className="cc-td">
        <select
          className="cc-input text-xs"
          value={req.coverage}
          onChange={(e) => onChange((r) => (r.coverage = e.target.value as Requirement['coverage']))}
        >
          <option value="fit">{t('req_cov_fit')}</option>
          <option value="partial">{t('req_cov_partial')}</option>
          <option value="gap">{t('req_cov_gap')}</option>
        </select>
        <span className={`he-scope mt-1 ${COV_CLASS[req.coverage]}`}>{t(`req_cov_${req.coverage}`)}</span>
      </td>
      <td className="cc-td">
        <span className={`he-scope ${parrotClass}`} title={p?.summary || undefined}>
          {parrotLabel}
        </span>
        {p?.summary && <div className="mt-1 line-clamp-3 text-[10px] text-slate-400" title={p.summary}>{p.summary}</div>}
        {p?.sources.map((s) => (
          <a key={s} href={s} target="_blank" rel="noopener noreferrer" className="block truncate text-[10px] text-cosmo-gold-dark hover:underline">
            {s}
          </a>
        ))}
      </td>
      <td className="cc-td">
        <div className="flex flex-col items-start gap-1">
          <span
            className={`he-scope ${req.decision === 'accepted' ? 'sc-in' : req.decision === 'rejected' ? 'sc-out' : 'sc-unset'}`}
          >
            {t(`req_dec_${req.decision}`)}
          </span>
          <div className="flex gap-2 text-xs font-semibold">
            {req.decision !== 'accepted' && req.assigned && (
              <button className="text-cosmo-gold-dark hover:underline" onClick={() => onChange((r) => (r.decision = 'accepted'))}>
                {t('req_accept')}
              </button>
            )}
            {req.decision === 'pending' && (
              <button className="text-slate-400 hover:underline" onClick={() => onChange((r) => (r.decision = 'rejected'))}>
                {t('req_reject')}
              </button>
            )}
            {req.decision !== 'pending' && (
              <button className="text-slate-400 hover:underline" onClick={() => onChange((r) => (r.decision = 'pending'))}>
                {t('req_reopen')}
              </button>
            )}
            <button className="text-slate-300 hover:text-rose-500" onClick={onRemove} title={t('remove')}>
              ✕
            </button>
          </div>
        </div>
      </td>
    </tr>
  )
}

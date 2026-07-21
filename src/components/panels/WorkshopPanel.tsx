import { useState } from 'react'
import { useStore } from '../../lib/store'
import { useLang } from '../../i18n/LanguageContext'
import { ARCHETYPES, GROUP_LABEL, archetypeById, areaKey, featureKey, industryOverlay } from '../../data/catalog'
import { catalogForEnvironment } from '../../lib/mbpcCatalog'
import { activeEnvironment, effectiveFeatureScope } from '../../lib/calc'
import { defaultFeatureEffort, isEffortEmpty } from '../../data/seed'
import { ScopeSegment } from '../ScopeSegment'
import { EnvSelector } from '../EnvSelector'
import { PanelTitle } from './ProspectPanel'
import type { Environment, ScopeState, ScopeStatus } from '../../types'

const SCOPE_LABEL: Record<ScopeStatus, { de: string; en: string }> = {
  in: { de: 'In Scope', en: 'In scope' },
  opt: { de: 'Optional', en: 'Optional' },
  out: { de: 'Out of Scope', en: 'Out of scope' },
  unset: { de: 'Offen', en: 'Open' },
}

export function WorkshopPanel() {
  const { t, lang } = useLang()
  const { state, update } = useStore()
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [noteOpen, setNoteOpen] = useState<Record<string, boolean>>({})

  const env = activeEnvironment(state)

  if (!env) {
    return (
      <div className="space-y-4">
        <PanelTitle title={t('tab_workshop')} intro={t('workshop_intro')} />
        <EnvSelector />
      </div>
    )
  }

  const scope: ScopeState = env.scope
  const catalog = catalogForEnvironment(env)
  const arch = archetypeById(env.archetypeId)
  const relevant = env.catalogSource === 'mbpc' ? null : arch.procs
  const overlaySet = new Set(
    industryOverlay(
      state.prospect.industryId,
      state.parameters.customIndustries ?? [],
      state.parameters.industryOverlays ?? {},
    ),
  )

  function mutateScope(fn: (e: Environment) => void) {
    update((d) => {
      const e = d.environments.find((x) => x.id === d.activeEnvironmentId) || d.environments[0]
      if (e) fn(e)
    })
  }

  function setProcScope(processId: string, v: ScopeStatus) {
    mutateScope((e) => {
      e.scope.proc[processId] = v
    })
  }
  function setAreaScope(processId: string, areaIdx: number, v: ScopeStatus) {
    mutateScope((e) => {
      e.scope.area[areaKey(processId, areaIdx)] = v
    })
  }
  function setFeatureScope(processId: string, areaIdx: number, stepIdx: number, v: ScopeStatus) {
    mutateScope((e) => {
      const key = featureKey(processId, areaIdx, stepIdx)
      const existing = e.scope.feature[key]
      if (existing) {
        existing.scope = v
        // Standard-Aufwandsvorlage anwenden, wenn Feature aufgenommen wird und noch kein Aufwand erfasst ist
        if (v === 'in' && isEffortEmpty(existing.effort)) existing.effort = defaultFeatureEffort()
      } else {
        e.scope.feature[key] = {
          scope: v,
          effort: v === 'in' ? defaultFeatureEffort() : { strategize: 0, initiate: 0, build: 0, prepare: 0, operate: 0 },
          products: [],
          standard: true,
        }
      }
    })
  }
  function setFeatureNote(processId: string, areaIdx: number, stepIdx: number, note: string) {
    mutateScope((e) => {
      const key = featureKey(processId, areaIdx, stepIdx)
      const existing = e.scope.feature[key]
      if (existing) existing.note = note
      else
        e.scope.feature[key] = {
          scope: 'unset',
          effort: { strategize: 0, initiate: 0, build: 0, prepare: 0, operate: 0 },
          products: [],
          standard: true,
          note,
        }
    })
  }
  function setArchetype(id: string) {
    mutateScope((e) => {
      e.archetypeId = id
    })
  }

  /**
   * Aggregiert den effektiven Scope über eine Feature-Menge (Priorität in > opt > out > unset).
   * `areaIdx === null` = ganzer Prozess, sonst nur der angegebene Bereich.
   * Nutzt effectiveFeatureScope, sodass Feature-, Bereichs- und Prozessebene konsistent sind.
   */
  function aggregateScope(processId: string, areaIdx: number | null): ScopeStatus {
    const proc = catalog.find((p) => p.id === processId)
    if (!proc) return 'unset'
    let any: ScopeStatus = 'unset'
    proc.areas.forEach((area, ai) => {
      if (areaIdx !== null && ai !== areaIdx) return
      area.steps.forEach((_s, si) => {
        const eff = effectiveFeatureScope(scope, processId, ai, si)
        if (eff === 'in') any = 'in'
        else if (eff === 'opt' && any !== 'in') any = 'opt'
        else if (eff === 'out' && any === 'unset') any = 'out'
      })
    })
    return any
  }

  /** aggregierter Scope-Status eines Prozesses (für Badge in Kachel/Kopf) */
  function procEffective(processId: string): ScopeStatus {
    return aggregateScope(processId, null)
  }

  /** aggregierter Scope-Status eines Prozessbereichs (für Bereichs-Node & -Badge) */
  function areaEffective(processId: string, areaIdx: number): ScopeStatus {
    return aggregateScope(processId, areaIdx)
  }

  const scList = (s: ScopeStatus) => `sc-${s}`

  return (
    <div className="space-y-4">
      <PanelTitle title={t('tab_workshop')} intro={t('workshop_intro')} />

      <EnvSelector />

      {/* Archetyp-Fokus (nur Standard-MBPC) */}
      {env.catalogSource !== 'mbpc' && (
      <div className="cc-card p-4">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          {t('focus_archetype')} · {env.name}
        </div>
        <div className="flex flex-wrap gap-2">
          {ARCHETYPES.map((a) => (
            <button
              key={a.id}
              onClick={() => setArchetype(a.id)}
              className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors ${
                arch.id === a.id
                  ? 'border-cosmo-gold bg-cosmo-gold/10 text-cosmo-anthracite'
                  : 'border-slate-200 text-slate-500 hover:bg-slate-50'
              }`}
            >
              {a.icon} {lang === 'de' ? a.label : a.labelEN}
            </button>
          ))}
        </div>
        {relevant && (
          <div className="mt-2 text-xs text-slate-400">
            {relevant.length} {t('relevant_of')} {catalog.length} {t('processes')}
          </div>
        )}
      </div>
      )}

      {/* Prozess-Kachelübersicht (Map-Tiles) */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {catalog.map((proc) => {
          const inFocus = !relevant || relevant.includes(proc.id)
          const eff = procEffective(proc.id)
          return (
            <button
              key={proc.id}
              onClick={() => setExpanded((e) => ({ ...e, [proc.id]: true }))}
              className={`map-tile grp-${proc.group} ${expanded[proc.id] ? 'selected' : ''} ${
                inFocus ? '' : 'opacity-40'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="shrink-0 text-xl">{proc.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold text-cosmo-anthracite">
                    {lang === 'de' ? proc.nameDE : proc.nameEN}
                  </div>
                  <div className="truncate text-[11px] text-slate-400">{GROUP_LABEL[proc.group][lang]}</div>
                </div>
                {overlaySet.has(proc.id) && (
                  <span className="shrink-0 text-sm" title={t('branch_relevant')} aria-label={t('branch_relevant')}>
                    ⭐
                  </span>
                )}
                <span className={`he-scope shrink-0 ${scList(eff)}`} style={{ whiteSpace: 'nowrap' }}>
                  {SCOPE_LABEL[eff][lang]}
                </span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Prozesskarten (detailliertes Scoping) */}
      <div className="space-y-3">
        {catalog.map((proc) => {
          const inFocus = !relevant || relevant.includes(proc.id)
          const procScope = scope.proc[proc.id] || 'unset'
          const eff = procEffective(proc.id)
          const open = expanded[proc.id]
          return (
            <div
              key={proc.id}
              className={`cc-card proc-card grp-${proc.group} overflow-hidden transition-opacity ${
                inFocus ? '' : 'opacity-40'
              }`}
            >
              <div className="flex items-center gap-3 p-4">
                <button
                  onClick={() => setExpanded((e) => ({ ...e, [proc.id]: !e[proc.id] }))}
                  className="shrink-0 text-slate-400 hover:text-slate-600"
                >
                  {open ? '▾' : '▸'}
                </button>
                <span className="shrink-0 text-2xl">{proc.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="break-words font-bold text-cosmo-anthracite">
                      {lang === 'de' ? proc.nameDE : proc.nameEN}
                    </span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                        proc.cosmo ? 'bg-cosmo-gold/15 text-cosmo-gold-dark' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {proc.cosmo ? 'COSMO' : 'MBPC'} · {proc.catId}
                    </span>
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
                      {GROUP_LABEL[proc.group][lang]}
                    </span>
                    {overlaySet.has(proc.id) && (
                      <span
                        className="rounded bg-cosmo-gold/15 px-1.5 py-0.5 text-[10px] font-bold text-cosmo-gold-dark"
                        title={t('branch_relevant')}
                      >
                        ⭐ {t('branch_relevant')}
                      </span>
                    )}
                    <span className={`he-scope ${scList(eff)}`}>{SCOPE_LABEL[eff][lang]}</span>
                  </div>
                  <div className="truncate text-xs text-slate-400">{lang === 'de' ? proc.intro : proc.introEN}</div>
                </div>
                <div className="shrink-0">
                  <ScopeSegment value={procScope} onChange={(v) => setProcScope(proc.id, v)} />
                </div>
              </div>

              {open && (
                <div className="border-t border-slate-100 bg-slate-50/50 p-3">
                  <ul className={`flex flex-wrap gap-x-4 gap-y-6 pt-3 grp-${proc.group}`}>
                    {proc.areas.map((area, areaIdx) => {
                      const aScope = scope.area[areaKey(proc.id, areaIdx)] || 'unset'
                      const aEff: ScopeStatus = areaEffective(proc.id, areaIdx)
                      return (
                        <li
                          key={areaIdx}
                          className={`pnode min-w-[240px] flex-1 basis-[280px] p-3 pt-5 scope-node-${aEff}`}
                        >
                          <span className="pn-nr">
                            {String(proc.catId)}.{areaIdx + 1}
                          </span>
                          <div className="mb-1 flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="break-words text-sm font-semibold text-slate-700">
                                {lang === 'de' ? area.t : area.en}
                              </div>
                              <div className="break-words text-[11px] italic text-slate-400">
                                {lang === 'de' ? area.en : area.t}
                              </div>
                            </div>
                            <div className="flex shrink-0 flex-col items-end gap-1">
                              {aEff !== 'unset' && (
                                <span
                                  className={`he-scope ${scList(aEff)}`}
                                  style={{ fontSize: 10, padding: '2px 8px', whiteSpace: 'nowrap' }}
                                >
                                  {SCOPE_LABEL[aEff][lang]}
                                </span>
                              )}
                              <ScopeSegment size="sm" value={aScope} onChange={(v) => setAreaScope(proc.id, areaIdx, v)} />
                            </div>
                          </div>
                          <div className="mb-2 text-[11px] text-slate-400">{lang === 'de' ? area.hint : area.hintEN}</div>
                          <div className="mb-2 flex flex-wrap gap-1">
                            {area.bc.map((b, i) => (
                              <span
                                key={i}
                                className="rounded bg-cosmo-anthracite/5 px-1.5 py-0.5 text-[10px] text-slate-500"
                              >
                                {b}
                              </span>
                            ))}
                          </div>
                          <ul className="space-y-1 border-t border-slate-100 pt-2">
                            {area.steps.map((step, stepIdx) => {
                              const fEff = effectiveFeatureScope(scope, proc.id, areaIdx, stepIdx)
                              const fKey = featureKey(proc.id, areaIdx, stepIdx)
                              const fs = scope.feature[fKey]
                              const explicit = fs && fs.scope !== 'unset'
                              const stepLabel = lang === 'de' ? step : area.stepsEN[stepIdx] || step
                              const hasNote = !!(fs?.note && fs.note.trim())
                              const nOpen = noteOpen[fKey] || hasNote
                              return (
                                <li key={stepIdx} className="py-0.5">
                                  <div className="flex items-center gap-2">
                                    {fEff !== 'unset' ? (
                                      <span className={`pn-chip shrink-0 ${scList(fEff)}`}>
                                        {fEff === 'in' ? 'IN' : fEff === 'opt' ? 'OPT' : 'OUT'}
                                      </span>
                                    ) : (
                                      <span className="h-2 w-2 shrink-0 rounded-full bg-slate-300" />
                                    )}
                                    <span className="min-w-0 flex-1 break-words text-xs text-slate-600">
                                      {stepLabel}
                                      {!explicit && fEff !== 'unset' && (
                                        <span className="ml-1 text-[10px] text-slate-300">
                                          ({lang === 'de' ? 'vererbt' : 'inherited'})
                                        </span>
                                      )}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => setNoteOpen((s) => ({ ...s, [fKey]: !nOpen }))}
                                      title={t('feature_note')}
                                      aria-label={t('feature_note')}
                                      className={`shrink-0 rounded px-1 text-sm leading-none transition-colors ${
                                        hasNote ? 'text-cosmo-gold-dark' : 'text-slate-300 hover:text-slate-500'
                                      }`}
                                    >
                                      {hasNote ? '💬' : '🗨'}
                                    </button>
                                    <div className="shrink-0">
                                      <ScopeSegment
                                        size="sm"
                                        value={fs?.scope || 'unset'}
                                        onChange={(v) => setFeatureScope(proc.id, areaIdx, stepIdx, v)}
                                      />
                                    </div>
                                  </div>
                                  {nOpen && (
                                    <textarea
                                      value={fs?.note || ''}
                                      onChange={(ev) => setFeatureNote(proc.id, areaIdx, stepIdx, ev.target.value)}
                                      placeholder={t('feature_note_placeholder')}
                                      rows={2}
                                      className="cc-input mt-1 w-full resize-y text-xs"
                                    />
                                  )}
                                </li>
                              )
                            })}
                          </ul>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

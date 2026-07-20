import { useStore } from '../lib/store'
import { useLang } from '../i18n/LanguageContext'
import { activeEnvironment } from '../lib/calc'

/**
 * Environment-Auswahl (pro Environment ein eigener MBPC-Workshop).
 * Setzt das aktive Environment, dessen Scope in Workshop/Mapping/Kalkulation
 * bearbeitet wird.
 */
export function EnvSelector({ label }: { label?: string }) {
  const { state, update } = useStore()
  const { t } = useLang()
  const active = activeEnvironment(state)

  function select(id: string) {
    update((d) => {
      d.activeEnvironmentId = id
    })
  }

  const TYPE_LABEL: Record<string, string> = {
    prod: t('env_type_prod'),
    test: t('env_type_test'),
    dev: t('env_type_dev'),
  }

  return (
    <div className="cc-card p-4">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label ?? t('env_context')}
      </div>
      <div className="flex flex-wrap gap-2">
        {state.environments.map((e) => {
          const on = active?.id === e.id
          return (
            <button
              key={e.id}
              onClick={() => select(e.id)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                on
                  ? 'border-cosmo-gold bg-cosmo-gold/10 text-cosmo-anthracite'
                  : 'border-slate-200 text-slate-500 hover:bg-slate-50'
              }`}
            >
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: on ? 'var(--cc-gold)' : 'var(--text-muted)' }}
              />
              <span>{e.name || t('tab_environments')}</span>
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
                {TYPE_LABEL[e.type] ?? e.type} · {e.country || '—'}
              </span>
            </button>
          )
        })}
        {state.environments.length === 0 && (
          <span className="text-sm text-slate-400">{t('no_env')}</span>
        )}
      </div>
    </div>
  )
}

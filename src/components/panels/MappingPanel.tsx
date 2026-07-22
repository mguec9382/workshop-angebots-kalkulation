import { useStore } from '../../lib/store'
import { useLang } from '../../i18n/LanguageContext'
import { PRODUCT_POOL, featureKey } from '../../data/catalog'
import { catalogForEnvironment } from '../../lib/mbpcCatalog'
import { stepModulesFor } from '../../lib/cosmoMbpc'
import { activeEnvironment, effectiveFeatureScope } from '../../lib/calc'
import { EnvSelector } from '../EnvSelector'
import { PanelTitle } from './ProspectPanel'

const VENDOR_STYLE: Record<string, string> = {
  microsoft: 'bg-blue-100 text-blue-700 border-blue-200',
  cosmo: 'bg-cosmo-gold/15 text-cosmo-gold-dark border-cosmo-gold/40',
  thirdparty: 'bg-slate-100 text-slate-600 border-slate-200',
}

export function MappingPanel() {
  const { t, lang } = useLang()
  const { state, update } = useStore()
  const env = activeEnvironment(state)
  const scope = env?.scope
  const catalog = env ? catalogForEnvironment(env) : []

  function toggleProduct(key: string, productId: string) {
    update((d) => {
      const e = d.environments.find((x) => x.id === d.activeEnvironmentId) || d.environments[0]
      const fs = e?.scope.feature[key]
      if (!fs) return
      const idx = fs.products.indexOf(productId)
      if (idx >= 0) fs.products.splice(idx, 1)
      else fs.products.push(productId)
    })
  }

  const rows = !scope
    ? []
    : catalog.map((proc) => {
        const items: { key: string; label: string; modules: string[] }[] = []
        proc.areas.forEach((area, areaIdx) => {
          area.steps.forEach((label, stepIdx) => {
            const key = featureKey(proc.id, areaIdx, stepIdx)
            if (!scope.feature[key]) return
            if (effectiveFeatureScope(scope, proc.id, areaIdx, stepIdx) !== 'in') return
            items.push({
              key,
              label: lang === 'de' ? label : area.stepsEN[stepIdx] || label,
              modules: stepModulesFor(catalog, proc.id, areaIdx, stepIdx),
            })
          })
        })
        return { proc, items }
      }).filter((r) => r.items.length > 0)

  return (
    <div className="space-y-4">
      <PanelTitle title={t('tab_mapping')} intro={t('mapping_intro')} />

      <EnvSelector />

      <div className="cc-card flex flex-wrap gap-2 p-3 text-xs">
        <span className={`rounded border px-2 py-1 ${VENDOR_STYLE.microsoft}`}>Microsoft</span>
        <span className={`rounded border px-2 py-1 ${VENDOR_STYLE.cosmo}`}>COSMO CONSULT</span>
        <span className={`rounded border px-2 py-1 ${VENDOR_STYLE.thirdparty}`}>Third-Party</span>
        <span className="rounded border border-cosmo-gold/50 bg-cosmo-gold/15 px-2 py-1 font-semibold text-cosmo-gold-dark">
          ✓ {t('mapping_module_legend')}
        </span>
      </div>

      {rows.length === 0 && (
        <div className="cc-card p-8 text-center text-sm text-slate-400">
          {t('no_inscope_features')}
        </div>
      )}

      {rows.map(({ proc, items }) => (
        <div key={proc.id} className="cc-card overflow-hidden">
          <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/60 px-4 py-2">
            <span className="text-lg">{proc.icon}</span>
            <span className="font-bold text-cosmo-anthracite">{lang === 'de' ? proc.nameDE : proc.nameEN}</span>
          </div>
          <div className="divide-y divide-slate-50">
            {items.map(({ key, label, modules }) => {
              const fs = scope!.feature[key]!
              return (
                <div key={key} className="flex flex-col gap-2 px-4 py-3 md:flex-row md:items-start">
                  <div className="w-full text-sm font-medium text-slate-700 md:w-64 md:shrink-0">
                    {label}
                    {modules.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {modules.map((m) => (
                          <span
                            key={m}
                            className="inline-flex items-center gap-1 rounded border border-cosmo-gold/50 bg-cosmo-gold/15 px-1.5 py-0.5 text-[11px] font-semibold text-cosmo-gold-dark"
                            title={t('mapping_module_hint')}
                          >
                            ✓ {m}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {PRODUCT_POOL.map((prod) => {
                      const on = fs.products.includes(prod.id)
                      return (
                        <button
                          key={prod.id}
                          onClick={() => toggleProduct(key, prod.id)}
                          className={`rounded border px-2 py-1 text-xs font-semibold transition-all ${
                            on ? VENDOR_STYLE[prod.vendor] : 'border-slate-200 bg-white text-slate-400 opacity-70 hover:opacity-100'
                          }`}
                        >
                          {on ? '✓ ' : '＋ '}
                          {prod.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

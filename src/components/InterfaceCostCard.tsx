import type { CalcResult } from '../lib/calc'
import { formatDays } from '../lib/calc'

/** Preisliche Ausweisung des Registers „Schnittstellen" (Management Summary & Dashboard). */
export function InterfaceCostCard({
  calc,
  t,
  formatCurrency,
}: {
  calc: CalcResult
  t: (k: string) => string
  formatCurrency: (v: number) => string
}) {
  const rows = [
    ...calc.interfaceLines.map((l) => ({ ...l, opt: false })),
    ...calc.optInterfaceLines.map((l) => ({ ...l, opt: true })),
  ]
  return (
    <div className="cc-card overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-cosmo-gold/10 px-4 py-2">
        <span>🔌</span>
        <span className="font-bold text-cosmo-anthracite dark:text-slate-100">{t('if_summary_title')}</span>
        <span className="rounded-full bg-cosmo-gold/20 px-2 py-0.5 text-xs font-semibold text-cosmo-gold-dark">
          {calc.interfaceLines.length} · {formatDays(calc.interfaceDays)} {t('perDay')} · {formatCurrency(calc.interfaceCost)}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="cc-th">{t('if_name')}</th>
              <th className="cc-th">{t('if_source')} → {t('if_target')}</th>
              <th className="cc-th">{t('if_platform')}</th>
              <th className="cc-th text-right">{t('perDay')}</th>
              <th className="cc-th text-right">{t('cost')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((l) => (
              <tr key={l.id} className={`border-b border-slate-50 ${l.opt ? 'text-amber-700' : ''}`}>
                <td className="cc-td font-semibold">
                  {l.name}
                  {l.opt && <span className="ml-2 rounded bg-amber-100 px-1.5 text-[10px]">{t('scope_opt_label')}</span>}
                </td>
                <td className="cc-td text-xs text-slate-500">
                  {l.source} → {l.target}
                </td>
                <td className="cc-td text-xs">{l.platform}</td>
                <td className="cc-td text-right">{formatDays(l.days)}</td>
                <td className="cc-td text-right">{formatCurrency(l.cost)}</td>
              </tr>
            ))}
            <tr className="bg-cosmo-gold/5 font-bold">
              <td className="cc-td" colSpan={3}>
                Σ {t('scope_in_label')}
              </td>
              <td className="cc-td text-right">{formatDays(calc.interfaceDays)}</td>
              <td className="cc-td text-right text-cosmo-gold">{formatCurrency(calc.interfaceCost)}</td>
            </tr>
            {calc.optInterfaceLines.length > 0 && (
              <tr className="font-semibold text-amber-700">
                <td className="cc-td" colSpan={3}>
                  Σ {t('scope_opt_label')}
                </td>
                <td className="cc-td text-right">{formatDays(calc.optInterfaceDays)}</td>
                <td className="cc-td text-right">{formatCurrency(calc.optInterfaceCost)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="px-4 py-2 text-xs text-slate-400">{t('if_summary_hint')}</p>
    </div>
  )
}

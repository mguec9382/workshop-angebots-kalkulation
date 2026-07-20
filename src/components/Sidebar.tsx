import { useStore } from '../lib/store'
import { useLang } from '../i18n/LanguageContext'
import type { CalcResult } from '../lib/calc'
import { formatCurrency, formatDays } from '../lib/calc'

export function Sidebar({ calc }: { calc: CalcResult }) {
  const { t } = useLang()
  const { state } = useStore()
  const cur = state.parameters.currency

  return (
    <aside className="cc-no-print hidden w-72 shrink-0 xl:block">
      <div className="sticky top-20 space-y-3">
        <div className="cc-card p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-cosmo-anthracite">
            <span className="text-cosmo-gold">◆</span> {t('live_calc')}
          </div>

          <Row label={t('effort_total')} value={`${formatDays(calc.serviceDays)} ${t('perDay')}`} />
          <Row label={t('service_onetime')} value={formatCurrency(calc.serviceCostOneTime, cur)} strong />
          <div className="my-2 border-t border-slate-100" />
          <Row label={t('license_monthly')} value={formatCurrency(calc.licenseMonthly, cur)} />
          <Row label={t('yearly')} value={formatCurrency(calc.licenseYearly, cur)} />
          <div className="my-2 border-t border-slate-100" />
          <Row
            label={`${t('total_period')} (${calc.periodMonths} ${t('months')})`}
            value={formatCurrency(calc.totalPeriod, cur)}
            strong
            gold
          />
        </div>

        <div className="cc-card p-4">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            {t('in_scope')}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Pill className="scope-in">{calc.scopeStats.in} in</Pill>
            <Pill className="scope-opt">{calc.scopeStats.opt} opt</Pill>
            <Pill className="scope-out">{calc.scopeStats.out} out</Pill>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full bg-cosmo-gold"
              style={{
                width: `${calc.scopeStats.total ? (calc.scopeStats.in / calc.scopeStats.total) * 100 : 0}%`,
              }}
            />
          </div>
          <div className="mt-1 text-xs text-slate-400">
            {calc.features.length} {t('rated_features')} · {calc.scopeStats.total} {t('overall').toLowerCase()}
          </div>
        </div>
      </div>
    </aside>
  )
}

function Row({ label, value, strong, gold }: { label: string; value: string; strong?: boolean; gold?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-2 py-0.5">
      <span className="text-xs text-slate-500">{label}</span>
      <span
        className={`text-right tabular-nums ${
          strong ? 'text-sm font-bold' : 'text-sm'
        } ${gold ? 'text-cosmo-gold' : 'text-cosmo-anthracite'}`}
      >
        {value}
      </span>
    </div>
  )
}

function Pill({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${className}`}>{children}</span>
}

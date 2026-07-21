import { useMemo, useState } from 'react'
import { useStore } from '../../lib/store'
import { useLang } from '../../i18n/LanguageContext'
import { archetypeById, findIndustry } from '../../data/catalog'
import { calculate, formatCurrency, formatDays } from '../../lib/calc'
import { exportExcelQuote } from '../../lib/excelExport'
import { PanelTitle } from './ProspectPanel'

export function ExportPanel() {
  const { t, lang } = useLang()
  const { state } = useStore()
  const calc = useMemo(() => calculate(state), [state])
  const cur = state.parameters.currency
  const p = state.prospect
  const [excelBusy, setExcelBusy] = useState(false)

  async function handleExcelExport() {
    setExcelBusy(true)
    try {
      await exportExcelQuote(state, lang)
    } catch (err) {
      console.error('Excel-Export fehlgeschlagen', err)
      alert(lang === 'de' ? 'Excel-Export fehlgeschlagen.' : 'Excel export failed.')
    } finally {
      setExcelBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="cc-no-print flex flex-wrap items-start justify-between gap-3">
        <PanelTitle title={t('tab_export')} intro={t('export_intro')} />
        <div className="flex flex-wrap gap-2">
          <button className="cc-btn-ghost" onClick={handleExcelExport} disabled={excelBusy}>
            📊 {excelBusy ? t('export_excel_busy') : t('export_excel')}
          </button>
          <button className="cc-btn-gold" onClick={() => window.print()}>
            🖨️ {t('print_pdf')}
          </button>
        </div>
      </div>

      {/* Druckbarer Report */}
      <div className="cc-card mx-auto max-w-4xl p-8">
        <div className="mb-6 flex items-center gap-3 border-b-2 border-cosmo-gold pb-4">
          <img src="/cosmo-mark.svg" alt="COSMO CONSULT" className="h-10 w-10" />
          <div>
            <div className="text-lg font-bold text-cosmo-anthracite">{t('quotation_title')}</div>
            <div className="text-sm text-slate-500">{t('appSubtitle')}</div>
          </div>
          <div className="ml-auto text-right text-xs text-slate-400">
            {new Date().toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-US')}
          </div>
        </div>

        {/* Interessent */}
        <section className="mb-6">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-cosmo-gold-dark">{t('tab_prospect')}</h2>
          <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
            <Info label={t('company')} value={p.company || '—'} />
            <Info label={t('contact')} value={p.contact || '—'} />
            <Info label={t('industry')} value={(lang === 'de' ? findIndustry(p.industryId, state.parameters.customIndustries)?.label : findIndustry(p.industryId, state.parameters.customIndustries)?.labelEN) || p.industryId} />
            <Info label={t('archetype')} value={lang === 'de' ? archetypeById(p.archetypeId).label : archetypeById(p.archetypeId).labelEN} />
            <Info label={t('size')} value={p.size || '—'} />
            <Info label={t('country')} value={p.country || '—'} />
            <Info label={t('projectStart')} value={p.projectStart || '—'} />
            <Info label={t('goLive')} value={p.goLive || '—'} />
          </div>
          {p.notes && <p className="mt-2 text-sm text-slate-600">{p.notes}</p>}
        </section>

        {/* Scope & Aufwand */}
        <section className="mb-6">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-cosmo-gold-dark">
            {t('tab_calculation')} · {t('services')}
          </h2>
          <div className="grid grid-cols-3 gap-3">
            <Metric label={t('in_scope')} value={`${calc.scopeStats.in}`} />
            <Metric label={t('effort_total')} value={`${formatDays(calc.serviceDays)} ${t('perDay')}`} />
            <Metric label={t('service_onetime')} value={formatCurrency(calc.serviceCostOneTime, cur)} />
          </div>
        </section>

        {/* Kosten je Environment */}
        <section className="mb-6">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-cosmo-gold-dark">{t('cost_by_env')}</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs text-slate-400">
                <th className="py-1">Environment</th>
                <th className="py-1 text-center">{t('country')}</th>
                <th className="py-1 text-right">{t('monthly')}</th>
                <th className="py-1 text-right">{t('yearly')}</th>
                <th className="py-1 text-right">{t('total_period')}</th>
              </tr>
            </thead>
            <tbody>
              {calc.perEnvironment.map((e) => (
                <tr key={e.id} className="border-b border-slate-100">
                  <td className="py-1">{e.name}</td>
                  <td className="py-1 text-center">{e.country}</td>
                  <td className="py-1 text-right">{formatCurrency(e.licenseMonthly, cur)}</td>
                  <td className="py-1 text-right">{formatCurrency(e.licenseYearly, cur)}</td>
                  <td className="py-1 text-right">{formatCurrency(e.licensePeriod, cur)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Gesamt */}
        <section className="rounded-lg bg-cosmo-anthracite p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wide text-white/60">
                {t('kpi_investment')} · {calc.periodMonths} {t('months')}
              </div>
              <div className="text-2xl font-bold text-cosmo-gold">{formatCurrency(calc.totalPeriod, cur)}</div>
            </div>
            <div className="text-right text-sm text-white/80">
              <div>{t('service_onetime')}: {formatCurrency(calc.serviceCostOneTime, cur)}</div>
              <div>{t('license_monthly')}: {formatCurrency(calc.licenseMonthly, cur)}</div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-slate-100 py-0.5">
      <span className="text-slate-400">{label}</span>
      <span className="font-medium text-slate-700">{value}</span>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="text-lg font-bold text-cosmo-anthracite">{value}</div>
    </div>
  )
}

import { useMemo, useState } from 'react'
import { useStore } from '../../lib/store'
import { useLang } from '../../i18n/LanguageContext'
import { calculate, formatCurrency, formatDays } from '../../lib/calc'
import { idbAvailable, type VersionKpis, type VersionMeta } from '../../lib/library'
import type { ProjectState } from '../../types'
import { PanelTitle } from './ProspectPanel'

export function VersionsPanel() {
  const { t, lang } = useLang()
  const { state, versions, saveVersion, restoreVersion, deleteVersion, loadVersionSnapshot } = useStore()

  const [label, setLabel] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [compare, setCompare] = useState<string[]>([])

  const available = idbAvailable()
  const locale = lang === 'de' ? 'de-DE' : 'en-GB'

  const currentKpis = useMemo<VersionKpis>(() => {
    const c = calculate(state)
    return {
      serviceDays: c.serviceDays,
      serviceCost: c.serviceCostOneTime,
      licenseMonthly: c.licenseMonthly,
      totalPeriod: c.totalPeriod,
      inScope: c.scopeStats.in,
    }
  }, [state])

  async function onSave() {
    setBusy(true)
    await saveVersion(label, note)
    setLabel('')
    setNote('')
    setBusy(false)
  }

  async function onRestore(id: string) {
    if (!confirm(t('version_restore_confirm'))) return
    setBusy(true)
    await restoreVersion(id)
    setBusy(false)
  }

  async function onDelete(id: string) {
    if (!confirm(t('version_delete_confirm'))) return
    setCompare((c) => c.filter((x) => x !== id))
    await deleteVersion(id)
  }

  async function onExport(v: VersionMeta) {
    const snap = await loadVersionSnapshot(v.id)
    if (!snap) return
    downloadJson(snap, `${v.label || 'version'}-${v.createdAt.slice(0, 10)}`)
  }

  function toggleCompare(id: string) {
    setCompare((c) => {
      if (c.includes(id)) return c.filter((x) => x !== id)
      if (c.length >= 2) return [c[1], id]
      return [...c, id]
    })
  }

  const compareVersions = compare
    .map((id) => versions.find((v) => v.id === id))
    .filter((v): v is VersionMeta => !!v)

  return (
    <div className="space-y-4">
      <PanelTitle title={t('versions_title')} intro={t('versions_intro')} />

      {!available && (
        <div className="cc-card border-l-4 border-l-amber-400 p-4 text-sm text-amber-700">
          {t('idb_unavailable')}
        </div>
      )}

      {/* Version speichern */}
      <div className="cc-card p-4">
        <div className="text-sm font-bold text-cosmo-anthracite">{t('version_save')}</div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="cc-label">{t('version_label')}</span>
            <input
              className="cc-input"
              value={label}
              placeholder={t('version_label_ph')}
              onChange={(e) => setLabel(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="cc-label">{t('version_note')}</span>
            <input
              className="cc-input"
              value={note}
              placeholder={t('version_note_ph')}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <KpiChip label={t('version_kpi_days')} value={formatDays(currentKpis.serviceDays)} />
          <KpiChip label={t('version_kpi_service')} value={formatCurrency(currentKpis.serviceCost)} />
          <KpiChip label={t('version_kpi_license')} value={formatCurrency(currentKpis.licenseMonthly)} />
          <KpiChip label={t('version_kpi_total')} value={formatCurrency(currentKpis.totalPeriod)} accent />
          <KpiChip label={t('version_kpi_inscope')} value={String(currentKpis.inScope)} />
          <span className="text-[11px] text-slate-400">({t('version_current')})</span>
        </div>

        <div className="mt-3">
          <button className="cc-btn-gold" onClick={onSave} disabled={!available || busy}>
            💾 {busy ? '…' : t('version_save')}
          </button>
        </div>
      </div>

      {/* Vergleich */}
      {compareVersions.length === 2 && (
        <CompareTable a={compareVersions[0]} b={compareVersions[1]} locale={locale} t={t} />
      )}

      {/* Versionsliste */}
      <div className="cc-card p-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm font-bold text-cosmo-anthracite">{t('versions_title')}</div>
          <div className="text-[11px] text-slate-400">{t('version_compare_hint')}</div>
        </div>

        {versions.length === 0 ? (
          <div className="py-6 text-center text-sm text-slate-400">{t('version_none')}</div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {versions.map((v) => (
              <div key={v.id} className="flex flex-wrap items-center gap-3 py-3">
                <input
                  type="checkbox"
                  className="accent-cosmo-gold"
                  checked={compare.includes(v.id)}
                  onChange={() => toggleCompare(v.id)}
                  title={t('version_compare')}
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-cosmo-anthracite">{v.label}</div>
                  <div className="text-[11px] text-slate-400">
                    {t('version_saved_at')} {new Date(v.createdAt).toLocaleString(locale)}
                    {v.note ? ` · ${v.note}` : ''}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <MiniKpi value={formatDays(v.kpis.serviceDays)} suffix="PT" />
                  <MiniKpi value={formatCurrency(v.kpis.licenseMonthly)} suffix="/M" />
                  <MiniKpi value={formatCurrency(v.kpis.totalPeriod)} accent />
                </div>
                <div className="flex items-center gap-1">
                  <button className="cc-btn-ghost !px-2 !py-1 text-xs" onClick={() => onRestore(v.id)} disabled={busy}>
                    ⟲ {t('version_restore')}
                  </button>
                  <button className="cc-btn-ghost !px-2 !py-1 text-xs" onClick={() => onExport(v)}>
                    ⭱ {t('version_export')}
                  </button>
                  <button
                    className="cc-btn-ghost !px-2 !py-1 text-xs text-rose-500"
                    onClick={() => onDelete(v.id)}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function KpiChip({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <span className="inline-flex items-baseline gap-1 rounded-lg bg-slate-100 px-2.5 py-1 dark:bg-[#232a37]">
      <span className="text-[10px] uppercase tracking-wide text-slate-400">{label}</span>
      <span className={`text-xs font-bold ${accent ? 'text-cosmo-gold-dark' : 'text-cosmo-anthracite'}`}>
        {value}
      </span>
    </span>
  )
}

function MiniKpi({ value, suffix, accent }: { value: string; suffix?: string; accent?: boolean }) {
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${
        accent ? 'bg-cosmo-gold/15 text-cosmo-gold-dark' : 'bg-slate-100 text-slate-600 dark:bg-[#232a37] dark:text-slate-300'
      }`}
    >
      {value}
      {suffix ? ` ${suffix}` : ''}
    </span>
  )
}

function CompareTable({
  a,
  b,
  locale,
  t,
}: {
  a: VersionMeta
  b: VersionMeta
  locale: string
  t: (k: string) => string
}) {
  const rows: { label: string; av: number; bv: number; money?: boolean; days?: boolean }[] = [
    { label: t('version_kpi_days'), av: a.kpis.serviceDays, bv: b.kpis.serviceDays, days: true },
    { label: t('version_kpi_service'), av: a.kpis.serviceCost, bv: b.kpis.serviceCost, money: true },
    { label: t('version_kpi_license'), av: a.kpis.licenseMonthly, bv: b.kpis.licenseMonthly, money: true },
    { label: t('version_kpi_total'), av: a.kpis.totalPeriod, bv: b.kpis.totalPeriod, money: true },
    { label: t('version_kpi_inscope'), av: a.kpis.inScope, bv: b.kpis.inScope },
  ]
  const fmt = (n: number, money?: boolean, days?: boolean) =>
    money ? formatCurrency(n) : days ? formatDays(n) : String(n)

  return (
    <div className="cc-card p-4">
      <div className="mb-3 text-sm font-bold text-cosmo-anthracite">{t('version_compare')}</div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-[11px] uppercase tracking-wide text-slate-400 dark:border-slate-700">
              <th className="py-2 pr-3 font-semibold"></th>
              <th className="py-2 pr-3 font-semibold">
                <div className="truncate">{a.label}</div>
                <div className="font-normal normal-case text-slate-400">
                  {new Date(a.createdAt).toLocaleDateString(locale)}
                </div>
              </th>
              <th className="py-2 pr-3 font-semibold">
                <div className="truncate">{b.label}</div>
                <div className="font-normal normal-case text-slate-400">
                  {new Date(b.createdAt).toLocaleDateString(locale)}
                </div>
              </th>
              <th className="py-2 font-semibold">Δ</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const delta = r.bv - r.av
              const up = delta > 0
              const down = delta < 0
              return (
                <tr key={r.label} className="border-b border-slate-50 dark:border-slate-800">
                  <td className="py-2 pr-3 text-slate-500">{r.label}</td>
                  <td className="py-2 pr-3 font-semibold text-cosmo-anthracite">{fmt(r.av, r.money, r.days)}</td>
                  <td className="py-2 pr-3 font-semibold text-cosmo-anthracite">{fmt(r.bv, r.money, r.days)}</td>
                  <td
                    className={`py-2 font-bold ${up ? 'text-rose-500' : down ? 'text-emerald-600' : 'text-slate-400'}`}
                  >
                    {delta === 0 ? '±0' : `${up ? '+' : ''}${fmt(delta, r.money, r.days)}`}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function downloadJson(data: ProjectState, name: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${name.replace(/\s+/g, '-').toLowerCase()}.json`
  a.click()
  URL.revokeObjectURL(url)
}

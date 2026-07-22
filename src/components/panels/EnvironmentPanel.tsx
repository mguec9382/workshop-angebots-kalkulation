import { useMemo, useRef, useState } from 'react'
import { useStore } from '../../lib/store'
import { useLang } from '../../i18n/LanguageContext'
import { calcEnvironment, formatCurrency } from '../../lib/calc'
import { newEnvironment, newMandant, uid } from '../../data/seed'
import {
  clearCatalog,
  cosmoAssetCount,
  loadCatalog,
  parseLicenseWorkbook,
  saveCatalog,
  searchCatalog,
} from '../../lib/licenseCatalog'
import {
  clearMbpcCatalog,
  loadMbpcCatalog,
  parseMbpcWorkbook,
  saveMbpcCatalog,
} from '../../lib/mbpcCatalog'
import {
  clearCosmoStandard,
  hasImportedCosmoStandard,
  loadCosmoStandardMeta,
  parseCosmoMbpcWorkbook,
  type CosmoStandardMeta,
} from '../../lib/cosmoMbpc'
import type { LicenseCatalog, LicenseCatalogItem, MbpcCatalog } from '../../types'
import { PanelTitle } from './ProspectPanel'

export function EnvironmentPanel() {
  const { t, lang } = useLang()
  const { state, update } = useStore()
  const cur = state.parameters.currency

  const [catalog, setCatalog] = useState<LicenseCatalog | null>(() => loadCatalog())
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const [mbpc, setMbpc] = useState<MbpcCatalog | null>(() => loadMbpcCatalog())
  const [mbpcImporting, setMbpcImporting] = useState(false)
  const [mbpcError, setMbpcError] = useState<string | null>(null)
  const mbpcFileRef = useRef<HTMLInputElement>(null)

  const [cosmoStd, setCosmoStd] = useState<{ meta: CosmoStandardMeta; imported: boolean }>(() => ({
    meta: loadCosmoStandardMeta(),
    imported: hasImportedCosmoStandard(),
  }))
  const [cosmoStdImporting, setCosmoStdImporting] = useState(false)
  const [cosmoStdError, setCosmoStdError] = useState<string | null>(null)
  const cosmoStdFileRef = useRef<HTMLInputElement>(null)

  async function onImportCosmoStd(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setCosmoStdImporting(true)
    setCosmoStdError(null)
    try {
      const { meta } = await parseCosmoMbpcWorkbook(file)
      setCosmoStd({ meta, imported: true })
    } catch (err) {
      setCosmoStdError(err instanceof Error ? err.message : t('import_failed'))
    } finally {
      setCosmoStdImporting(false)
    }
  }

  function resetCosmoStd() {
    clearCosmoStandard()
    setCosmoStd({ meta: loadCosmoStandardMeta(), imported: false })
  }

  async function onImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setImporting(true)
    setImportError(null)
    try {
      const parsed = await parseLicenseWorkbook(file)
      if (!parsed.items.length) throw new Error(t('import_no_products'))
      saveCatalog(parsed)
      setCatalog(parsed)
    } catch (err) {
      setImportError(err instanceof Error ? err.message : t('import_failed'))
    } finally {
      setImporting(false)
    }
  }

  function removeCatalog() {
    clearCatalog()
    setCatalog(null)
  }

  async function onImportMbpc(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setMbpcImporting(true)
    setMbpcError(null)
    try {
      const parsed = await parseMbpcWorkbook(file)
      if (!parsed.processCount) throw new Error(t('mbpc_import_empty'))
      saveMbpcCatalog(parsed)
      setMbpc(parsed)
    } catch (err) {
      setMbpcError(err instanceof Error ? err.message : t('import_failed'))
    } finally {
      setMbpcImporting(false)
    }
  }

  function removeMbpc() {
    clearMbpcCatalog()
    setMbpc(null)
    // Environments auf Standard-Katalog zurücksetzen
    update((d) =>
      d.environments.forEach((env) => {
        if (env.catalogSource === 'mbpc') {
          env.catalogSource = 'standard'
          env.workloads = []
        }
      }),
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PanelTitle title={t('tab_environments')} intro={t('env_intro')} />
        <label className="flex items-center gap-2 text-sm">
          <span className="text-slate-500">{t('period')}:</span>
          <input
            type="number"
            className="w-20 rounded border border-slate-300 px-2 py-1 text-right dark:border-slate-600 dark:bg-[#232a37]"
            value={state.periodMonths}
            onChange={(e) => update((d) => (d.periodMonths = parseInt(e.target.value) || 12))}
          />
          <span className="text-slate-500">{t('months')}</span>
        </label>
      </div>

      {/* Lizenzpreisliste (Import-Schnittstelle) */}
      <div className="cc-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-bold text-cosmo-anthracite">{t('pricelist')}</div>
            <div className="mt-0.5 max-w-2xl text-xs text-slate-400">{t('pricelist_intro')}</div>
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={onImportFile}
            />
            <button className="cc-btn-gold" onClick={() => fileRef.current?.click()} disabled={importing}>
              ⭳ {importing ? '…' : t('import_pricelist')}
            </button>
            {catalog && (
              <button className="cc-btn-ghost" onClick={removeCatalog}>
                {t('clear_pricelist')}
              </button>
            )}
          </div>
        </div>
        {importError && <div className="mt-2 text-xs font-semibold text-rose-500">{importError}</div>}
        <div className="mt-2 text-xs text-slate-500">
          {catalog ? (
            <>
              <b className="text-cosmo-anthracite">{catalog.items.length}</b> {t('catalog_items')}
              {catalog.scannedCount ? (
                <>
                  {' '}
                  {t('catalog_of')} {catalog.scannedCount} {t('catalog_scanned')}
                </>
              ) : null}{' '}
              · <b className="text-cosmo-gold-dark">{cosmoAssetCount(catalog)}</b> {t('cosmo_assets')} ·{' '}
              {catalog.fileName} · {t('imported_on')}{' '}
              {new Date(catalog.importedAt).toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-GB')}
            </>
          ) : (
            t('no_pricelist')
          )}
        </div>
      </div>

      {/* COSMO Standard-MBPC (Prozesskatalog · Pakete, Module, SbD-Aufwände) – Import-Schnittstelle */}
      <div className="cc-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-cosmo-anthracite">
              📚 {t('cosmo_std_title')}
            </div>
            <div className="mt-0.5 max-w-2xl text-xs text-slate-400">{t('cosmo_std_intro')}</div>
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={cosmoStdFileRef}
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={onImportCosmoStd}
            />
            <button
              className="cc-btn-gold"
              onClick={() => cosmoStdFileRef.current?.click()}
              disabled={cosmoStdImporting}
            >
              ⭳ {cosmoStdImporting ? '…' : t('cosmo_std_import')}
            </button>
            {cosmoStd.imported && (
              <button className="cc-btn-ghost" onClick={resetCosmoStd}>
                {t('cosmo_std_reset')}
              </button>
            )}
          </div>
        </div>
        {cosmoStdError && <div className="mt-2 text-xs font-semibold text-rose-500">{cosmoStdError}</div>}
        <div className="mt-2 text-xs text-slate-500">
          <b className={cosmoStd.imported ? 'text-cosmo-gold-dark' : 'text-cosmo-anthracite'}>
            {cosmoStd.imported ? t('cosmo_std_imported') : t('cosmo_std_bundled')}
          </b>
          {' · '}
          <b className="text-cosmo-anthracite">{cosmoStd.meta.processCount}</b> {t('mbpc_processes')} ·{' '}
          <b className="text-cosmo-anthracite">{cosmoStd.meta.areaCount}</b> {t('mbpc_areas')} ·{' '}
          <b className="text-cosmo-anthracite">{cosmoStd.meta.packageCount}</b> {t('cosmo_std_packages')} ·{' '}
          <b className="text-cosmo-gold-dark">{cosmoStd.meta.moduleCount}</b> {t('cosmo_std_modules')}
          {cosmoStd.imported && (
            <>
              {' · '}
              {cosmoStd.meta.fileName} · {t('imported_on')}{' '}
              {new Date(cosmoStd.meta.importedAt).toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-GB')}
            </>
          )}
        </div>
      </div>

      {/* Microsoft Business Process Catalog (Workload-MBPC) – dauerhafte Import-Schnittstelle */}
      <div className="cc-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-cosmo-anthracite">
              🧩 {t('mbpc_title')}
            </div>
            <div className="mt-0.5 max-w-2xl text-xs text-slate-400">{t('mbpc_intro')}</div>
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={mbpcFileRef}
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={onImportMbpc}
            />
            <button className="cc-btn-gold" onClick={() => mbpcFileRef.current?.click()} disabled={mbpcImporting}>
              ⭳ {mbpcImporting ? '…' : t('mbpc_import')}
            </button>
            {mbpc && (
              <button className="cc-btn-ghost" onClick={removeMbpc}>
                {t('mbpc_clear')}
              </button>
            )}
          </div>
        </div>
        {mbpcError && <div className="mt-2 text-xs font-semibold text-rose-500">{mbpcError}</div>}
        <div className="mt-2 text-xs text-slate-500">
          {mbpc ? (
            <>
              <b className="text-cosmo-anthracite">{mbpc.processCount}</b> {t('mbpc_processes')} ·{' '}
              <b className="text-cosmo-anthracite">{mbpc.areaCount}</b> {t('mbpc_areas')} ·{' '}
              <b className="text-cosmo-anthracite">{mbpc.stepCount}</b> {t('mbpc_steps')} ·{' '}
              <b className="text-cosmo-gold-dark">{mbpc.workloads.length}</b> {t('mbpc_workloads')} · {mbpc.fileName} ·{' '}
              {t('imported_on')} {new Date(mbpc.importedAt).toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-GB')}
            </>
          ) : (
            t('mbpc_none')
          )}
        </div>
      </div>

      <button
        className="cc-btn-gold"
        onClick={() =>
          update((d) => {
            const env = newEnvironment(t('new_env_name'), 'all', 'DE')
            env.currency = cur
            env.users = 10
            d.environments.push(env)
            d.activeEnvironmentId = env.id
          })
        }
      >
        ＋ {t('add_env')}
      </button>

      {state.environments.map((env, ei) => {
        const c = calcEnvironment(env, state.parameters, state.periodMonths)
        return (
          <div key={env.id} className="cc-card overflow-hidden">
            <div className="grid grid-cols-1 gap-3 border-b border-slate-100 bg-slate-50/60 p-4 sm:grid-cols-2 lg:grid-cols-5">
              <label className="block">
                <span className="cc-label">{t('env_name')}</span>
                <input
                  className="cc-input"
                  value={env.name}
                  onChange={(e) => update((d) => (d.environments[ei].name = e.target.value))}
                />
              </label>
              <label className="block">
                <span className="cc-label">{t('env_type')}</span>
                <select
                  className="cc-input"
                  value={env.type}
                  onChange={(e) => update((d) => (d.environments[ei].type = e.target.value as 'prod' | 'test' | 'dev'))}
                >
                  <option value="prod">{t('env_type_prod')}</option>
                  <option value="test">{t('env_type_test')}</option>
                  <option value="dev">{t('env_type_dev')}</option>
                </select>
              </label>
              <label className="block">
                <span className="cc-label">{t('country')}</span>
                <input
                  className="cc-input"
                  value={env.country}
                  onChange={(e) => update((d) => (d.environments[ei].country = e.target.value.toUpperCase()))}
                />
              </label>
              <label className="block">
                <span className="cc-label">{t('users')}</span>
                <input
                  type="number"
                  className="cc-input"
                  value={env.users}
                  onChange={(e) => update((d) => (d.environments[ei].users = parseInt(e.target.value) || 0))}
                />
              </label>
              <div className="flex items-end justify-between gap-2">
                <div className="text-right">
                  <div className="text-xs text-slate-400">{t('monthly')}</div>
                  <div className="font-bold text-cosmo-anthracite">{formatCurrency(c.licenseMonthly, cur)}</div>
                </div>
                <button
                  className="text-slate-300 hover:text-rose-500"
                  onClick={() =>
                    update((d) => {
                      d.environments.splice(ei, 1)
                      if (d.activeEnvironmentId === env.id) {
                        d.activeEnvironmentId = d.environments[0]?.id ?? ''
                      }
                    })
                  }
                  title={t('remove')}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Prozesskatalog-Quelle (Standard-MBPC vs. Microsoft Workload-MBPC) */}
            <div className="border-b border-slate-100 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-slate-600">{t('catalog_source')}</span>
                <select
                  className="cc-input max-w-xs"
                  value={env.catalogSource ?? 'standard'}
                  disabled={!mbpc}
                  onChange={(e) =>
                    update((d) => {
                      d.environments[ei].catalogSource = e.target.value as 'standard' | 'mbpc'
                      if (e.target.value === 'mbpc' && !d.environments[ei].workloads) d.environments[ei].workloads = []
                    })
                  }
                >
                  <option value="standard">{t('catalog_source_standard')}</option>
                  <option value="mbpc" disabled={!mbpc}>
                    {t('catalog_source_mbpc')}
                  </option>
                </select>
                {!mbpc && <span className="text-xs text-slate-400">{t('catalog_source_hint')}</span>}
              </div>

              {env.catalogSource === 'mbpc' && mbpc && (
                <div className="mt-3">
                  <div className="mb-1.5 flex flex-wrap items-center gap-2">
                    <span className="cc-label !mb-0">{t('mbpc_workloads_label')}</span>
                    <span className="text-xs text-slate-400">
                      {(env.workloads?.length || 0)} {t('mbpc_selected')}
                    </span>
                    <button
                      className="text-xs font-semibold text-cosmo-gold-dark hover:underline"
                      onClick={() => update((d) => (d.environments[ei].workloads = mbpc.workloads.map((w) => w.id)))}
                    >
                      {t('mbpc_select_all')}
                    </button>
                    <span className="text-slate-300">·</span>
                    <button
                      className="text-xs font-semibold text-slate-400 hover:underline"
                      onClick={() => update((d) => (d.environments[ei].workloads = []))}
                    >
                      {t('mbpc_select_none')}
                    </button>
                  </div>
                  <div className="mt-1 text-xs text-slate-400">{t('mbpc_workloads_hint')}</div>
                  {mbpc.families.map((fam) => (
                    <div key={fam} className="mt-2">
                      <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{fam}</div>
                      <div className="flex flex-wrap gap-1.5">
                        {mbpc.workloads
                          .filter((w) => w.family === fam)
                          .map((w) => {
                            const on = env.workloads?.includes(w.id) ?? false
                            return (
                              <button
                                key={w.id}
                                onClick={() =>
                                  update((d) => {
                                    const list = d.environments[ei].workloads ?? (d.environments[ei].workloads = [])
                                    const idx = list.indexOf(w.id)
                                    if (idx >= 0) list.splice(idx, 1)
                                    else list.push(w.id)
                                  })
                                }
                                className={`rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors ${
                                  on
                                    ? 'border-cosmo-gold bg-cosmo-gold/15 text-cosmo-anthracite dark:text-slate-100'
                                    : 'border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-white/5'
                                }`}
                              >
                                {w.label}
                                <span className="ml-1 text-[10px] text-slate-400">{w.count}</span>
                              </button>
                            )
                          })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Mandanten */}
            <div className="border-b border-slate-100 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-600">{t('mandanten')}</span>
                <button
                  className="cc-btn-ghost"
                  onClick={() =>
                    update((d) => {
                      const m = newMandant(d.environments[ei].country || 'DE')
                      m.currency = d.environments[ei].currency || cur
                      d.environments[ei].mandanten.push(m)
                    })
                  }
                >
                  ＋ {t('add_mandant')}
                </button>
              </div>
              {env.mandanten.length === 0 ? (
                <div className="text-xs text-slate-400">{t('no_mandanten')}</div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="cc-th">{t('mandant_name')}</th>
                      <th className="cc-th w-24 text-center">{t('country')}</th>
                      <th className="cc-th w-24 text-right">{t('users')}</th>
                      <th className="cc-th w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {env.mandanten.map((m, mi) => (
                      <tr key={m.id} className="border-b border-slate-50">
                        <td className="cc-td">
                          <input
                            className="w-full rounded border border-transparent px-2 py-1 hover:border-slate-200 focus:border-cosmo-gold focus:outline-none dark:bg-transparent dark:text-slate-100 dark:hover:border-slate-600"
                            placeholder={t('mandant_name')}
                            value={m.name}
                            onChange={(e) => update((d) => (d.environments[ei].mandanten[mi].name = e.target.value))}
                          />
                        </td>
                        <td className="cc-td text-center">
                          <input
                            className="w-16 rounded border border-slate-200 px-2 py-1 text-center uppercase focus:border-cosmo-gold focus:outline-none dark:bg-[#232a37]"
                            value={m.country}
                            onChange={(e) =>
                              update((d) => (d.environments[ei].mandanten[mi].country = e.target.value.toUpperCase()))
                            }
                          />
                        </td>
                        <td className="cc-td text-right">
                          <input
                            type="number"
                            className="w-20 rounded border border-slate-200 px-2 py-1 text-right focus:border-cosmo-gold focus:outline-none dark:bg-[#232a37]"
                            value={m.users}
                            onChange={(e) =>
                              update((d) => (d.environments[ei].mandanten[mi].users = parseInt(e.target.value) || 0))
                            }
                          />
                        </td>
                        <td className="cc-td text-center">
                          <button
                            className="text-slate-300 hover:text-rose-500"
                            onClick={() => update((d) => d.environments[ei].mandanten.splice(mi, 1))}
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Lizenzen */}
            <div className="p-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-semibold text-slate-600">{t('licenses')}</span>
                <button
                  className="cc-btn-ghost"
                  onClick={() =>
                    update((d) =>
                      d.environments[ei].licenses.push({
                        id: uid('lic'),
                        product: 'Business Central',
                        unitPriceMonthly: 0,
                        quantity: 1,
                      }),
                    )
                  }
                >
                  ＋ {t('add_license')}
                </button>
              </div>

              {/* Katalog-Picker */}
              <CatalogPicker
                catalog={catalog}
                onPick={(item) =>
                  update((d) =>
                    d.environments[ei].licenses.push({
                      id: uid('lic'),
                      product: item.description,
                      unitPriceMonthly: Math.round(item.monthlyPrice * 100) / 100,
                      quantity: 1,
                      code: item.code,
                    }),
                  )
                }
              />

              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="cc-th">{t('product')}</th>
                    <th className="cc-th w-32 text-right">{t('unitPrice')}</th>
                    <th className="cc-th w-24 text-right">{t('quantity')}</th>
                    <th className="cc-th w-32 text-right">{t('monthly')}</th>
                    <th className="cc-th w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {env.licenses.map((lic, li) => (
                    <tr key={lic.id} className="border-b border-slate-50">
                      <td className="cc-td">
                        <input
                          className="w-full rounded border border-transparent px-2 py-1 hover:border-slate-200 focus:border-cosmo-gold focus:outline-none dark:bg-transparent dark:text-slate-100 dark:hover:border-slate-600"
                          value={lic.product}
                          onChange={(e) => update((d) => (d.environments[ei].licenses[li].product = e.target.value))}
                        />
                        {lic.code && <div className="px-2 text-[10px] text-slate-400">{lic.code}</div>}
                      </td>
                      <td className="cc-td text-right">
                        <input
                          type="number"
                          step={0.5}
                          className="w-24 rounded border border-slate-200 px-2 py-1 text-right focus:border-cosmo-gold focus:outline-none dark:bg-[#232a37]"
                          value={lic.unitPriceMonthly}
                          onChange={(e) =>
                            update((d) => (d.environments[ei].licenses[li].unitPriceMonthly = parseFloat(e.target.value) || 0))
                          }
                        />
                      </td>
                      <td className="cc-td text-right">
                        <input
                          type="number"
                          className="w-20 rounded border border-slate-200 px-2 py-1 text-right focus:border-cosmo-gold focus:outline-none dark:bg-[#232a37]"
                          value={lic.quantity}
                          onChange={(e) =>
                            update((d) => (d.environments[ei].licenses[li].quantity = parseInt(e.target.value) || 0))
                          }
                        />
                      </td>
                      <td className="cc-td text-right font-semibold">
                        {formatCurrency(lic.unitPriceMonthly * lic.quantity, cur)}
                      </td>
                      <td className="cc-td text-center">
                        <button
                          className="text-slate-300 hover:text-rose-500"
                          onClick={() => update((d) => d.environments[ei].licenses.splice(li, 1))}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-2 flex flex-wrap justify-end gap-6 border-t border-slate-100 pt-2 text-sm">
                <span className="text-slate-500">
                  {t('service_onetime')}: <b className="text-cosmo-anthracite">{formatCurrency(c.serviceCostOneTime, cur)}</b>
                </span>
                <span className="text-slate-500">
                  {t('yearly')}: <b className="text-cosmo-anthracite">{formatCurrency(c.licenseYearly, cur)}</b>
                </span>
                <span className="text-slate-500">
                  {t('total_period')} ({state.periodMonths} {t('months')}):{' '}
                  <b className="text-cosmo-gold">{formatCurrency(c.totalPeriod, cur)}</b>
                </span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/** Suchfeld für den importierten Lizenzkatalog mit Ergebnisliste. */
function CatalogPicker({
  catalog,
  onPick,
}: {
  catalog: LicenseCatalog | null
  onPick: (item: LicenseCatalogItem) => void
}) {
  const { t } = useLang()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [cosmoOnly, setCosmoOnly] = useState(false)

  const results = useMemo(
    () => (open ? searchCatalog(catalog, query, 30, { cosmoOnly }) : []),
    [catalog, query, open, cosmoOnly],
  )

  if (!catalog) return null

  return (
    <div className="relative mb-3">
      <div className="flex items-center gap-2">
        <input
          className="cc-input flex-1"
          placeholder={`${t('add_from_catalog')} — ${t('search_license')}`}
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
        />
        <button
          type="button"
          onClick={() => {
            setCosmoOnly((v) => !v)
            setOpen(true)
          }}
          className={`shrink-0 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
            cosmoOnly
              ? 'border-cosmo-gold bg-cosmo-gold/15 text-cosmo-gold-dark'
              : 'border-slate-200 text-slate-500 hover:border-cosmo-gold dark:border-slate-600'
          }`}
          title={t('cosmo_only')}
        >
          ◆ {t('cosmo_only')}
        </button>
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-600 dark:bg-[#232a37]">
          {results.map((item, i) => (
            <button
              key={`${item.code}-${i}`}
              onClick={() => {
                onPick(item)
                setOpen(false)
                setQuery('')
              }}
              className="flex w-full items-center justify-between gap-3 border-b border-slate-50 px-3 py-2 text-left text-xs hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-[#2a3341]"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-slate-700">
                  {item.cosmo && (
                    <span className="mr-1 rounded bg-cosmo-gold/20 px-1 text-[9px] font-bold uppercase tracking-wide text-cosmo-gold-dark">
                      COSMO
                    </span>
                  )}
                  {item.description}
                </span>
                <span className="text-[10px] text-slate-400">
                  {item.vendor} · {item.code || '—'} · {item.unit}
                </span>
              </span>
              <span className="shrink-0 font-bold text-cosmo-gold-dark">
                {formatCurrency(item.monthlyPrice, 'EUR')}/M
              </span>
            </button>
          ))}
        </div>
      )}
      {open && (
        <button
          className="absolute right-2 top-2 text-xs text-slate-400 hover:text-slate-600"
          onClick={() => setOpen(false)}
        >
          ✕
        </button>
      )}
    </div>
  )
}

import { useRef, useState } from 'react'
import { useStore } from '../lib/store'
import { useLang } from '../i18n/LanguageContext'
import { catalogForEnvironment } from '../lib/mbpcCatalog'
import { ACCEPTED_FILE_TYPES, applyRequirement, buildRequirements, extractFromFile, unapplyRequirement } from '../lib/requirementsAgent'
import { buildParrotPackage, isParrotLoggedIn, loadParrotUrl, openParrot, parrotLogin, parrotLogout, parseParrotResults, saveParrotUrl } from '../lib/parrotMcp'
import { RequirementsTable } from './RequirementsTable'
import type { Requirement } from '../types'

function download(name: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

/** KI-Anforderungs-Agent: Anforderungen einlesen, mit dem MBPC abgleichen, gegen Cosmo Parrot prüfen, in den Scope übernehmen. */
export function RequirementsAgent() {
  const { t } = useLang()
  const { state, update } = useStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const importRef = useRef<HTMLInputElement>(null)

  const [envId, setEnvId] = useState(state.activeEnvironmentId)
  const target = state.environments.find((e) => e.id === envId) ?? state.environments[0]
  const reqs = target?.requirements ?? []

  const [busy, setBusy] = useState(false)
  const [info, setInfo] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [parrotUrl, setParrotUrl] = useState(loadParrotUrl)
  const [loggedIn, setLoggedIn] = useState(isParrotLoggedIn)

  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (!files.length || !target) return
    setBusy(true)
    setError(null)
    setInfo(null)
    try {
      const catalog = catalogForEnvironment(target)
      const added: Requirement[] = []
      for (const f of files) {
        const raws = await extractFromFile(f)
        added.push(...buildRequirements(raws, f.name, catalog, [...reqs, ...added]))
      }
      if (!added.length) throw new Error(t('req_none_found'))
      update((d) => {
        const env = d.environments.find((x) => x.id === target.id)
        if (!env) return
        env.requirements = [...(env.requirements ?? []), ...added]
        d.activeEnvironmentId = env.id
      })
      setInfo(`${added.length} ${t('req_added')}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('import_failed'))
    } finally {
      setBusy(false)
    }
  }

  function adoptAll() {
    if (!target) return
    let n = 0
    update((d) => {
      const env = d.environments.find((x) => x.id === target.id)
      if (!env) return
      const cat = catalogForEnvironment(env)
      env.requirements?.forEach((r) => {
        if (r.decision === 'pending' && applyRequirement(env, r, cat)) n++
      })
      d.activeEnvironmentId = env.id
    })
    setInfo(`${n} ${t('req_adopted')}`)
  }

  async function loginToParrot() {
    saveParrotUrl(parrotUrl)
    setBusy(true)
    setError(null)
    setInfo(null)
    try {
      await parrotLogin(parrotUrl.trim())
      setLoggedIn(true)
      setInfo(t('req_parrot_loggedin'))
    } catch (err) {
      setError(`${t('req_parrot_error')}: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setBusy(false)
    }
  }

  async function checkWithParrot() {
    if (!target || !parrotUrl.trim()) return
    saveParrotUrl(parrotUrl)
    setBusy(true)
    setError(null)
    setInfo(null)
    try {
      const check = await openParrot(parrotUrl.trim())
      const todo = reqs.filter((r) => r.decision !== 'rejected' && (!r.parrot || r.parrot.state === 'error'))
      for (let i = 0; i < todo.length; i++) {
        setInfo(`${t('req_parrot_running')} … ${i + 1}/${todo.length}`)
        const res = await check(todo[i])
        update((d) => {
          const r = d.environments.find((x) => x.id === target.id)?.requirements?.find((x) => x.id === todo[i].id)
          if (r) r.parrot = res
        })
        if (res.state === 'error') throw new Error(res.summary)
      }
      setInfo(`${todo.length} ${t('req_parrot_imported')}`)
    } catch (err) {
      setError(`${t('req_parrot_error')}: ${err instanceof Error ? err.message : String(err)}`)
      setLoggedIn(isParrotLoggedIn())
    } finally {
      setBusy(false)
    }
  }

  async function onImportResult(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !target) return
    setError(null)
    try {
      const results = parseParrotResults(await file.text())
      let n = 0
      update((d) => {
        d.environments
          .find((x) => x.id === target.id)
          ?.requirements?.forEach((r) => {
            const res = results.get(r.id)
            if (res) {
              r.parrot = res
              n++
            }
          })
      })
      setInfo(`${n} ${t('req_parrot_imported')}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('import_failed'))
    }
  }

  const pending = reqs.filter((r) => r.decision === 'pending' && r.assigned).length

  return (
    <div className="cc-card p-4">
      <div className="flex items-center gap-2 text-sm font-bold text-cosmo-anthracite">🤖 {t('req_title')}</div>
      <div className="mt-0.5 max-w-3xl text-xs text-slate-400">{t('req_intro')}</div>

      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="block min-w-[220px]">
          <span className="cc-label">{t('req_target_env')}</span>
          <select className="cc-input" value={target?.id ?? ''} onChange={(e) => setEnvId(e.target.value)}>
            {state.environments.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name || t('tab_environments')}
              </option>
            ))}
          </select>
        </label>
        <input ref={fileRef} type="file" multiple accept={ACCEPTED_FILE_TYPES} className="hidden" onChange={onFiles} />
        <button className="cc-btn-gold" disabled={busy || !target} onClick={() => fileRef.current?.click()}>
          ⭳ {busy ? '…' : t('req_upload')}
        </button>
        {pending > 0 && (
          <button className="cc-btn-ghost" disabled={busy} onClick={adoptAll}>
            ✓ {t('req_adopt_all')} ({pending})
          </button>
        )}
        {reqs.length > 0 && (
          <button
            className="cc-btn-ghost"
            disabled={busy}
            onClick={() =>
              target &&
              window.confirm(`${t('req_clear')}?`) &&
              update((d) => {
                const env = d.environments.find((x) => x.id === target.id)
                if (!env) return
                env.requirements?.forEach((r) => r.decision === 'accepted' && unapplyRequirement(env, r))
                env.requirements = []
              })
            }
          >
            {t('req_clear')}
          </button>
        )}
      </div>
      <div className="mt-1 text-[11px] text-slate-400">{t('req_local_hint')}</div>

      {/* Gegenprüfung Cosmo Parrot */}
      <div className="mt-3 rounded-lg border border-dashed border-slate-200 p-3 dark:border-slate-700">
        <label className="block">
          <span className="cc-label">{t('req_parrot_endpoint')}</span>
          <input
            className="cc-input"
            placeholder="https://…"
            value={parrotUrl}
            onChange={(e) => setParrotUrl(e.target.value)}
          />
        </label>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {loggedIn ? (
            <>
              <span className="he-scope sc-in">{t('req_parrot_loggedin')}</span>
              <button
                className="cc-btn-ghost"
                onClick={() => {
                  parrotLogout()
                  setLoggedIn(false)
                }}
              >
                {t('req_parrot_logout')}
              </button>
            </>
          ) : (
            <button className="cc-btn-gold" disabled={busy || !parrotUrl.trim()} onClick={loginToParrot}>
              🔐 {t('req_parrot_login')}
            </button>
          )}
          <button className="cc-btn-gold" disabled={busy || !reqs.length || !loggedIn} onClick={checkWithParrot}>
            🦜 {t('req_parrot_check')}
          </button>
          <button
            className="cc-btn-ghost"
            disabled={!reqs.length}
            onClick={() => download('parrot-pruefpaket.json', buildParrotPackage(reqs.filter((r) => r.decision !== 'rejected')))}
          >
            {t('req_parrot_export')}
          </button>
          <input ref={importRef} type="file" accept=".json,application/json" className="hidden" onChange={onImportResult} />
          <button className="cc-btn-ghost" disabled={!reqs.length} onClick={() => importRef.current?.click()}>
            {t('req_parrot_import')}
          </button>
        </div>
        <div className="mt-1 text-[11px] text-slate-400">{t('req_parrot_hint')}</div>
      </div>

      {error && <div className="mt-2 text-xs font-semibold text-rose-500">{error}</div>}
      {info && <div className="mt-2 text-xs font-semibold text-cosmo-gold-dark">{info}</div>}

      {target && reqs.length > 0 && (
        <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-700">
          <RequirementsTable envId={target.id} />
        </div>
      )}
    </div>
  )
}

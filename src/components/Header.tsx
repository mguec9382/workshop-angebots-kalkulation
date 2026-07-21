import { useRef, useState } from 'react'
import { useStore } from '../lib/store'
import { useLang } from '../i18n/LanguageContext'
import { useTheme } from '../lib/theme'
import { useUiPrefs } from '../lib/uiPrefs'
import { HelpPanel } from './HelpPanel'
import type { ProjectState } from '../types'

export function Header() {
  const { t, lang, setLang } = useLang()
  const {
    state,
    replace,
    loadExample,
    reset,
    dirty,
    markSaved,
    projects,
    currentProjectId,
    newProject,
    switchProject,
    duplicateProject,
    deleteProject,
  } = useStore()
  const { theme, toggle } = useTheme()
  const { showLiveCalc, toggleLiveCalc } = useUiPrefs()
  const fileRef = useRef<HTMLInputElement>(null)
  const [helpOpen, setHelpOpen] = useState(false)

  function onDeleteProject() {
    if (projects.length === 0) return
    if (confirm(t('project_delete_confirm'))) deleteProject(currentProjectId)
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const name = state.prospect.company || 'projekt'
    a.href = url
    a.download = `${name.replace(/\s+/g, '-').toLowerCase()}-kalkulation.json`
    a.click()
    URL.revokeObjectURL(url)
    markSaved()
  }

  function importJson(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result)) as ProjectState
        replace(data)
      } catch {
        alert('Ungültige JSON-Datei.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <header className="cc-no-print sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-700 dark:bg-[#141a24]/95">
      <div className="mx-auto flex w-full max-w-[1600px] items-center gap-4 px-4 py-3">
        <img src={`${import.meta.env.BASE_URL}cosmo-mark.svg`} alt="COSMO CONSULT" className="h-9 w-9 shrink-0" />
        <div className="min-w-0">
          <div className="truncate text-sm font-bold text-cosmo-anthracite">{t('appTitle')}</div>
          <div className="truncate text-xs text-slate-400">{t('appSubtitle')}</div>
        </div>

        {/* Interessenten-Switcher */}
        {projects.length > 0 && (
          <div className="ml-2 flex items-center gap-1">
            <select
              className="max-w-[220px] truncate rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-semibold text-cosmo-anthracite focus:border-cosmo-gold focus:outline-none dark:border-slate-600 dark:bg-[#232a37] dark:text-slate-100"
              value={currentProjectId}
              onChange={(e) => switchProject(e.target.value)}
              title={t('project_switch')}
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <button className="cc-btn-ghost !px-2 !py-1.5 text-xs" onClick={newProject} title={t('project_new')}>
              ＋
            </button>
            <button
              className="cc-btn-ghost !px-2 !py-1.5 text-xs"
              onClick={() => duplicateProject(currentProjectId)}
              title={t('project_duplicate')}
            >
              ⧉
            </button>
            <button
              className="cc-btn-ghost !px-2 !py-1.5 text-xs text-rose-500"
              onClick={onDeleteProject}
              title={t('project_delete')}
            >
              🗑
            </button>
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
              dirty ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
            }`}
          >
            {dirty ? '● ' + t('unsaved') : '✓ ' + t('saved')}
          </span>

          <button className="cc-btn-ghost" onClick={loadExample} title={t('loadExample')}>
            ★ {t('loadExample')}
          </button>
          <button className="cc-btn-ghost" onClick={() => fileRef.current?.click()}>
            ⭳ {t('import_json')}
          </button>
          <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={importJson} />
          <button className="cc-btn-gold" onClick={exportJson}>
            ⭱ {t('export_json')}
          </button>
          <button className="cc-btn-ghost" onClick={reset} title={t('reset')}>
            ⟲
          </button>

          <button
            className="cc-btn-ghost"
            onClick={toggle}
            title={theme === 'dark' ? t('lightMode') : t('darkMode')}
            aria-label={theme === 'dark' ? t('lightMode') : t('darkMode')}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          <button
            className="cc-btn-ghost"
            onClick={() => setHelpOpen(true)}
            title={t('help_title')}
            aria-label={t('help_title')}
          >
            ❔ {t('help')}
          </button>

          <button
            className={showLiveCalc ? 'cc-btn-gold' : 'cc-btn-ghost'}
            onClick={toggleLiveCalc}
            title={showLiveCalc ? t('hideLiveCalc') : t('showLiveCalc')}
            aria-label={showLiveCalc ? t('hideLiveCalc') : t('showLiveCalc')}
            aria-pressed={showLiveCalc}
          >
            {showLiveCalc ? '📊' : '👁️'} {t('customerView')}
          </button>

          <div className="ml-1 flex overflow-hidden rounded-lg border border-slate-300 text-xs font-semibold">
            {(['de', 'en'] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`px-2.5 py-1.5 ${lang === l ? 'bg-cosmo-anthracite text-white' : 'bg-white text-slate-500'}`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>
      {helpOpen && <HelpPanel onClose={() => setHelpOpen(false)} />}
    </header>
  )
}

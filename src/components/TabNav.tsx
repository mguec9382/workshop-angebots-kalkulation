import { useLang } from '../i18n/LanguageContext'

export type TabId =
  | 'prospect'
  | 'workshop'
  | 'mapping'
  | 'calculation'
  | 'parameters'
  | 'environments'
  | 'summary'
  | 'dashboard'
  | 'versions'
  | 'export'

const TABS: { id: TabId; key: string; icon: string }[] = [
  { id: 'prospect', key: 'tab_prospect', icon: '🏢' },
  { id: 'environments', key: 'tab_environments', icon: '🗂️' },
  { id: 'workshop', key: 'tab_workshop', icon: '📋' },
  { id: 'mapping', key: 'tab_mapping', icon: '🧩' },
  { id: 'calculation', key: 'tab_calculation', icon: '💰' },
  { id: 'parameters', key: 'tab_parameters', icon: '⚙️' },
  { id: 'summary', key: 'tab_summary', icon: '📊' },
  { id: 'dashboard', key: 'tab_dashboard', icon: '📈' },
  { id: 'versions', key: 'tab_versions', icon: '🗃️' },
  { id: 'export', key: 'tab_export', icon: '📤' },
]

export function TabNav({ active, onChange }: { active: TabId; onChange: (t: TabId) => void }) {
  const { t } = useLang()
  return (
    <nav className="cc-no-print border-b border-slate-200 bg-white">
      <div className="mx-auto flex w-full max-w-[1600px] gap-1 overflow-x-auto px-4">
        {TABS.map((tab, i) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`relative flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-3 text-sm font-semibold transition-colors ${
              active === tab.id
                ? 'border-cosmo-gold text-cosmo-anthracite'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <span className="text-xs text-slate-300">{i + 1}</span>
            <span>{tab.icon}</span>
            <span>{t(tab.key)}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}

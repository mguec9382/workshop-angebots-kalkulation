import { useMemo, useState } from 'react'
import { useStore } from './lib/store'
import { useLang } from './i18n/LanguageContext'
import { useUiPrefs } from './lib/uiPrefs'
import { calculate } from './lib/calc'
import { Header } from './components/Header'
import { TabNav } from './components/TabNav'
import type { TabId } from './components/TabNav'
import { Sidebar } from './components/Sidebar'
import { ProspectPanel } from './components/panels/ProspectPanel'
import { WorkshopPanel } from './components/panels/WorkshopPanel'
import { MappingPanel } from './components/panels/MappingPanel'
import { CalculationPanel } from './components/panels/CalculationPanel'
import { ParameterPanel } from './components/panels/ParameterPanel'
import { EnvironmentPanel } from './components/panels/EnvironmentPanel'
import { SummaryPanel } from './components/panels/SummaryPanel'
import { DashboardPanel } from './components/panels/DashboardPanel'
import { VersionsPanel } from './components/panels/VersionsPanel'
import { ExportPanel } from './components/panels/ExportPanel'

export default function App() {
  const { state } = useStore()
  const { t } = useLang()
  const { showLiveCalc } = useUiPrefs()
  const [tab, setTab] = useState<TabId>('prospect')

  const calc = useMemo(() => calculate(state), [state])

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <TabNav active={tab} onChange={setTab} />
      <div className="mx-auto flex w-full max-w-[1600px] flex-1 gap-6 px-4 py-6">
        <main className="min-w-0 flex-1">
          {tab === 'prospect' && <ProspectPanel onNext={() => setTab('environments')} />}
          {tab === 'workshop' && <WorkshopPanel />}
          {tab === 'mapping' && <MappingPanel />}
          {tab === 'calculation' && <CalculationPanel />}
          {tab === 'parameters' && <ParameterPanel />}
          {tab === 'environments' && <EnvironmentPanel />}
          {tab === 'summary' && <SummaryPanel />}
          {tab === 'dashboard' && <DashboardPanel />}
          {tab === 'versions' && <VersionsPanel />}
          {tab === 'export' && <ExportPanel />}
        </main>
        {showLiveCalc && <Sidebar calc={calc} />}
      </div>
      <footer className="cc-no-print border-t border-slate-200 bg-white py-3 text-center text-xs text-slate-400">
        {t('appTitle')} · COSMO CONSULT · {new Date().getFullYear()}
      </footer>
    </div>
  )
}

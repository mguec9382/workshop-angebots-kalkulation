import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'

const CALC_KEY = 'cc-workshop-show-livecalc'

interface UiPrefs {
  /** Live-Kalkulation (Sidebar) sichtbar? false = Kundenansicht */
  showLiveCalc: boolean
  toggleLiveCalc: () => void
}

const UiPrefsContext = createContext<UiPrefs | null>(null)

function getInitialShowLiveCalc(): boolean {
  try {
    const stored = localStorage.getItem(CALC_KEY)
    if (stored === 'true') return true
    if (stored === 'false') return false
  } catch {
    /* ignore */
  }
  return true
}

export function UiPrefsProvider({ children }: { children: ReactNode }) {
  const [showLiveCalc, setShowLiveCalc] = useState<boolean>(getInitialShowLiveCalc)

  useEffect(() => {
    try {
      localStorage.setItem(CALC_KEY, String(showLiveCalc))
    } catch {
      /* ignore */
    }
  }, [showLiveCalc])

  const toggleLiveCalc = useCallback(() => setShowLiveCalc((v) => !v), [])

  return (
    <UiPrefsContext.Provider value={{ showLiveCalc, toggleLiveCalc }}>
      {children}
    </UiPrefsContext.Provider>
  )
}

export function useUiPrefs(): UiPrefs {
  const ctx = useContext(UiPrefsContext)
  if (!ctx) throw new Error('useUiPrefs must be used within UiPrefsProvider')
  return ctx
}

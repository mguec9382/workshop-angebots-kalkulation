import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'

const CALC_KEY = 'cc-workshop-show-livecalc'
const CHF_KEY = 'cc-workshop-show-chf'

interface UiPrefs {
  /** Live-Kalkulation (Sidebar) sichtbar? false = Kundenansicht */
  showLiveCalc: boolean
  toggleLiveCalc: () => void
  /** Beträge in Schweizer Franken (CHF) anzeigen (nur bei Schweizer Interessenten wirksam) */
  showCHF: boolean
  toggleCHF: () => void
}

const UiPrefsContext = createContext<UiPrefs | null>(null)

function getInitialBool(key: string, fallback: boolean): boolean {
  try {
    const stored = localStorage.getItem(key)
    if (stored === 'true') return true
    if (stored === 'false') return false
  } catch {
    /* ignore */
  }
  return fallback
}

export function UiPrefsProvider({ children }: { children: ReactNode }) {
  const [showLiveCalc, setShowLiveCalc] = useState<boolean>(() => getInitialBool(CALC_KEY, true))
  const [showCHF, setShowCHF] = useState<boolean>(() => getInitialBool(CHF_KEY, false))

  useEffect(() => {
    try {
      localStorage.setItem(CALC_KEY, String(showLiveCalc))
    } catch {
      /* ignore */
    }
  }, [showLiveCalc])

  useEffect(() => {
    try {
      localStorage.setItem(CHF_KEY, String(showCHF))
    } catch {
      /* ignore */
    }
  }, [showCHF])

  const toggleLiveCalc = useCallback(() => setShowLiveCalc((v) => !v), [])
  const toggleCHF = useCallback(() => setShowCHF((v) => !v), [])

  return (
    <UiPrefsContext.Provider value={{ showLiveCalc, toggleLiveCalc, showCHF, toggleCHF }}>
      {children}
    </UiPrefsContext.Provider>
  )
}

export function useUiPrefs(): UiPrefs {
  const ctx = useContext(UiPrefsContext)
  if (!ctx) throw new Error('useUiPrefs must be used within UiPrefsProvider')
  return ctx
}

import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import type { CalcResult } from './calc'

// Ein einziges Kalkulationsergebnis für den gesamten Baum – verhindert, dass
// Sidebar und Panels auseinanderlaufen (eigene useMemo-Caches zu unterschiedlichen Zeitpunkten).
const CalcContext = createContext<CalcResult | null>(null)

export function CalcProvider({ value, children }: { value: CalcResult; children: ReactNode }) {
  return <CalcContext.Provider value={value}>{children}</CalcContext.Provider>
}

export function useCalc(): CalcResult {
  const ctx = useContext(CalcContext)
  if (!ctx) throw new Error('useCalc must be used within CalcProvider')
  return ctx
}

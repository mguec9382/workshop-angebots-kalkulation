import { useStore } from './store'
import { useUiPrefs } from './uiPrefs'
import { formatCurrency } from './calc'

/** Standard-Umrechnungskurs Basiswährung → CHF, falls im Projekt kein Kurs gepflegt ist. */
export const DEFAULT_CHF_RATE = 0.95

/** Erkennt Schweizer Interessenten anhand der freien Länder-Eingabe. */
export function isSwitzerland(country: string): boolean {
  const c = (country || '').trim().toLowerCase()
  return (
    c === 'ch' ||
    c === 'che' ||
    c === 'schweiz' ||
    c === 'switzerland' ||
    c === 'suisse' ||
    c === 'svizzera'
  )
}

export interface CurrencyView {
  /** aktuell angezeigte Währung (Basiswährung oder 'CHF') */
  cur: string
  /** Basiswährung des Projekts */
  baseCur: string
  /** wandelt einen Betrag in die Anzeigewährung um */
  convert: (value: number) => number
  /** formatiert einen (Basiswährungs-)Betrag in der Anzeigewährung */
  fmt: (value: number) => string
  /** CHF-Ansicht ist verfügbar (Schweizer Interessent, Basiswährung ≠ CHF) */
  canCHF: boolean
  /** CHF-Ansicht ist aktiv */
  active: boolean
  /** verwendeter Umrechnungskurs */
  rate: number
}

/**
 * Liefert die aktive Anzeigewährung samt Umrechnung. Ist der Interessent aus der
 * Schweiz und die CHF-Ansicht eingeschaltet, werden alle Beträge zum hinterlegten
 * Kurs in CHF umgerechnet – rein für die Darstellung, die Eingabedaten bleiben in
 * der Basiswährung.
 */
export function useCurrencyView(): CurrencyView {
  const { state } = useStore()
  const { showCHF } = useUiPrefs()
  const baseCur = state.parameters.currency
  const rate = state.parameters.chfRate ?? DEFAULT_CHF_RATE
  const canCHF = isSwitzerland(state.prospect.country) && baseCur !== 'CHF'
  const active = canCHF && showCHF
  const cur = active ? 'CHF' : baseCur
  const convert = (value: number) => (active ? value * rate : value)
  const fmt = (value: number) => formatCurrency(convert(value), cur)
  return { cur, baseCur, convert, fmt, canCHF, active, rate }
}

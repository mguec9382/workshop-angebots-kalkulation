import { useLang } from '../i18n/LanguageContext'
import { useUiPrefs } from '../lib/uiPrefs'
import { useCurrencyView } from '../lib/currencyView'

/**
 * Umschalter zwischen Basiswährung und CHF-Ansicht. Wird nur eingeblendet, wenn
 * der Interessent aus der Schweiz kommt und die Basiswährung nicht bereits CHF ist.
 */
export function CurrencyToggle() {
  const { t } = useLang()
  const { canCHF, active, baseCur, rate } = useCurrencyView()
  const { toggleCHF } = useUiPrefs()
  if (!canCHF) return null
  return (
    <button
      className={active ? 'cc-btn-gold' : 'cc-btn-ghost'}
      onClick={toggleCHF}
      title={t('chf_toggle_hint').replace('{cur}', baseCur).replace('{rate}', String(rate))}
      aria-pressed={active}
    >
      🇨🇭 {active ? t('chf_view_on') : `${baseCur} → CHF`}
    </button>
  )
}

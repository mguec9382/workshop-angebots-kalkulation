import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Lang } from '../types'
import { translate } from './translations'

interface LanguageContextValue {
  lang: Lang
  setLang: (l: Lang) => void
  t: (key: string) => string
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

const LANG_KEY = 'cc-workshop-lang'

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    try {
      return (localStorage.getItem(LANG_KEY) as Lang) || 'de'
    } catch {
      return 'de'
    }
  })

  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    try {
      localStorage.setItem(LANG_KEY, l)
    } catch {
      /* ignore */
    }
  }, [])

  const t = useCallback((key: string) => translate(key, lang), [lang])

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLang(): LanguageContextValue {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLang muss innerhalb von LanguageProvider verwendet werden')
  return ctx
}

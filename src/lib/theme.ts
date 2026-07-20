import { useCallback, useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'

const THEME_KEY = 'cc-workshop-theme'

export function getInitialTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_KEY)
    if (stored === 'light' || stored === 'dark') return stored
    if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'dark'
  } catch {
    /* ignore */
  }
  return 'light'
}

export function applyTheme(theme: Theme): void {
  const root = document.documentElement
  if (theme === 'dark') root.classList.add('dark')
  else root.classList.remove('dark')
}

/** Hook zum Umschalten zwischen Light- und Dark-Mode (persistiert in localStorage). */
export function useTheme(): { theme: Theme; toggle: () => void } {
  const [theme, setTheme] = useState<Theme>(() => getInitialTheme())

  useEffect(() => {
    applyTheme(theme)
    try {
      localStorage.setItem(THEME_KEY, theme)
    } catch {
      /* ignore */
    }
  }, [theme])

  const toggle = useCallback(() => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'))
  }, [])

  return { theme, toggle }
}

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { StoreProvider } from './lib/store'
import { LanguageProvider } from './i18n/LanguageContext'
import { UiPrefsProvider } from './lib/uiPrefs'
import { applyTheme, getInitialTheme } from './lib/theme'

// Theme vor dem ersten Render setzen (kein Flash)
applyTheme(getInitialTheme())

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LanguageProvider>
      <StoreProvider>
        <UiPrefsProvider>
          <App />
        </UiPrefsProvider>
      </StoreProvider>
    </LanguageProvider>
  </React.StrictMode>,
)

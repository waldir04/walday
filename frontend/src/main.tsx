import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './shared/i18n'
import App from './App.tsx'
import { loadPreferences } from './shared/lib/preferencesStorage'
import { applyLanguage } from './shared/i18n'

applyLanguage(loadPreferences().language)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

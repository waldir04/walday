import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/inter'
import '../index.css'
import '@/shared/i18n'
import i18n, { applyLanguage } from '@/shared/i18n'
import {
  getDefaultPreferences,
  loadPreferences,
  resolveLanguage,
} from '@/entities/preferences'
import { initEnv } from '@/shared/config/env'
import { App } from './App'

export interface BootstrapOptions {
  rootId?: string
  envSource?: Record<string, unknown>
}

function showConfigurationError(root: HTMLElement): void {
  const heading = document.createElement('h1')
  heading.textContent = i18n.t('configError.heading')
  heading.className = 'text-title font-semibold text-danger'

  const description = document.createElement('p')
  description.textContent = i18n.t('configError.description')
  description.className = 'mt-2 text-body'

  const container = document.createElement('div')
  container.setAttribute('role', 'alert')
  container.className = 'mx-auto max-w-2xl px-page py-section'
  container.append(heading, description)

  root.replaceChildren(container)
}

function installGlobalErrorHandlers(): void {
  window.addEventListener('unhandledrejection', () => {
    console.error('[walday] Unhandled promise rejection')
  })
  window.addEventListener('error', () => {
    console.error('[walday] Uncaught error')
  })
}

export function bootstrap({
  rootId = 'root',
  envSource,
}: BootstrapOptions = {}): boolean {
  const root = document.getElementById(rootId)
  if (!root) {
    console.error('[walday] Root element is missing')
    return false
  }

  try {
    initEnv(envSource)
  } catch {
    showConfigurationError(root)
    return false
  }

  const loaded = loadPreferences()
  const preferences =
    loaded.kind === 'restored' || loaded.kind === 'partial'
      ? loaded.preferences
      : getDefaultPreferences()
  applyLanguage(resolveLanguage(preferences.language).language)
  installGlobalErrorHandlers()

  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
  return true
}

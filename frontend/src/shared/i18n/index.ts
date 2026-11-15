import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import type { SupportedLanguage } from '@/shared/config/i18n'
import enCommon from './locales/en/common.json'
import esCommon from './locales/es/common.json'
import enPreferences from './locales/en/preferences.json'
import esPreferences from './locales/es/preferences.json'
import enCommitments from './locales/en/commitments.json'
import esCommitments from './locales/es/commitments.json'
import enTasks from './locales/en/tasks.json'
import esTasks from './locales/es/tasks.json'
import enHome from './locales/en/home.json'
import esHome from './locales/es/home.json'
import enAgenda from './locales/en/agenda.json'
import esAgenda from './locales/es/agenda.json'

export const defaultNS = 'common'
export const namespaces = [
  'common',
  'preferences',
  'commitments',
  'tasks',
  'home',
  'agenda',
] as const

export const resources = {
  en: {
    common: enCommon,
    preferences: enPreferences,
    commitments: enCommitments,
    tasks: enTasks,
    home: enHome,
    agenda: enAgenda,
  },
  es: {
    common: esCommon,
    preferences: esPreferences,
    commitments: esCommitments,
    tasks: esTasks,
    home: esHome,
    agenda: esAgenda,
  },
}

function readableFallback(key: string): string {
  const segment = key.split('.').at(-1) ?? key
  const words = segment
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    defaultNS,
    ns: [...namespaces],
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
    parseMissingKeyHandler: readableFallback,
  })
}

export function applyLanguage(language: SupportedLanguage): void {
  void i18n.changeLanguage(language)
  if (typeof document !== 'undefined') {
    document.documentElement.lang = language
  }
}

export default i18n

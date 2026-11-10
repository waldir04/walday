import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import enPreferences from './locales/en/preferences.json'
import esPreferences from './locales/es/preferences.json'

export const defaultNS = 'translation'

export const resources = {
  en: {
    translation: {
      app: { name: 'Walday' },
      nav: { home: 'Home', tasks: 'Tasks', settings: 'Settings' },
      ...enPreferences,
    },
  },
  es: {
    translation: {
      app: { name: 'Walday' },
      nav: { home: 'Inicio', tasks: 'Tareas', settings: 'Configuración' },
      ...esPreferences,
    },
  },
} as const

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  })
}

export function applyLanguage(language: string): void {
  if (language === 'en' || language === 'es') {
    void i18n.changeLanguage(language)
  } else {
    void i18n.changeLanguage('en')
  }
}

export default i18n
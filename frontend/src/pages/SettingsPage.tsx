import { useTranslation } from 'react-i18next'
import { PreferencesForm } from '../features/user-preferences/ui/PreferencesForm'
import { usePreferencesContext } from '../features/user-preferences/model/preferencesContext'

export function SettingsPage() {
  const { t } = useTranslation()
  const { preferences, updatePreferences } = usePreferencesContext()

  return (
    <section>
      <h1 className="text-2xl font-semibold">{t('title')}</h1>
      <PreferencesForm preferences={preferences} onSave={updatePreferences} />
    </section>
  )
}

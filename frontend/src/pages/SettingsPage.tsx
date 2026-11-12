import { useTranslation } from 'react-i18next'
import {
  PreferencesForm,
  usePreferencesContext,
} from '@/features/user-preferences'

export function SettingsPage() {
  const { t } = useTranslation('preferences')
  const { preferences, updatePreferences } = usePreferencesContext()

  return (
    <section>
      <h1 tabIndex={-1} className="text-2xl font-semibold">
        {t('title')}
      </h1>
      <PreferencesForm preferences={preferences} onSave={updatePreferences} />
    </section>
  )
}

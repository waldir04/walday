import { useTranslation } from 'react-i18next'
import {
  GuestStorageNotice,
  PreferencesForm,
  StorageNotice,
} from '@/features/user-preferences'

export function SettingsPage() {
  const { t } = useTranslation('preferences')

  return (
    <section className="space-y-section">
      <div className="space-y-2">
        <h1
          id="preferences-heading"
          tabIndex={-1}
          className="text-title font-semibold"
        >
          {t('title')}
        </h1>
        <p className="text-body text-text-muted">{t('description')}</p>
      </div>
      <GuestStorageNotice />
      <div aria-live="polite" aria-atomic="true">
        <StorageNotice />
      </div>
      <PreferencesForm />
    </section>
  )
}

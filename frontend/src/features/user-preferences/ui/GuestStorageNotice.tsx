import { useTranslation } from 'react-i18next'

export function GuestStorageNotice() {
  const { t } = useTranslation('preferences')

  return (
    <aside className="rounded-card border border-border bg-surface-subtle p-3">
      <h2 className="text-body font-semibold text-text">
        {t('guestNotice.heading')}
      </h2>
      <p className="mt-1 text-caption text-text-muted">
        {t('guestNotice.description')}
      </p>
    </aside>
  )
}

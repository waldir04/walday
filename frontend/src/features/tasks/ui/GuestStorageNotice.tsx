import { useTranslation } from 'react-i18next'

export function GuestStorageNotice() {
  const { t } = useTranslation('tasks')

  return (
    <p className="rounded-2xl border border-border bg-surface-raised p-5 text-caption text-text-muted">
      {t('guestNotice')}
    </p>
  )
}

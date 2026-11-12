import { useTranslation } from 'react-i18next'

export function GuestStorageNotice() {
  const { t } = useTranslation('tasks')

  return <p className="text-caption text-text-muted">{t('guestNotice')}</p>
}

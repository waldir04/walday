import { useTranslation } from 'react-i18next'
import { Skeleton } from './Skeleton'

export function Loading() {
  const { t } = useTranslation()
  return (
    <div aria-busy="true" aria-live="polite" className="space-y-section">
      <p className="sr-only">{t('loading.label')}</p>
      <Skeleton lines={1} className="max-w-xs" />
      <Skeleton lines={3} />
    </div>
  )
}

import { useTranslation } from 'react-i18next'
import { Skeleton } from '@/shared/ui/Skeleton'

export function PreferencesPageSkeleton() {
  const { t } = useTranslation('preferences')

  return (
    <div aria-busy="true" aria-live="polite" className="space-y-section">
      <p className="sr-only">{t('skeletonLabel')}</p>
      <div aria-hidden="true" className="space-y-2">
        <div className="h-8 w-40 animate-pulse rounded-control bg-surface-raised" />
        <div className="h-4 w-full max-w-xl animate-pulse rounded-control bg-surface-raised" />
      </div>
      <div
        aria-hidden="true"
        className="space-y-stack rounded-2xl border border-border bg-surface p-5"
      >
        <Skeleton lines={1} />
        <Skeleton lines={1} />
        <Skeleton lines={1} />
      </div>
      <div
        aria-hidden="true"
        className="space-y-stack rounded-2xl border border-border bg-surface p-5"
      >
        <Skeleton lines={1} />
        <Skeleton lines={2} />
      </div>
    </div>
  )
}

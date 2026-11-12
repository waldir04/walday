import { useTranslation } from 'react-i18next'
import { Skeleton } from '@/shared/ui/Skeleton'

export function TasksPageSkeleton() {
  const { t } = useTranslation('tasks')

  return (
    <div aria-busy="true" aria-live="polite" className="space-y-section">
      <p className="sr-only">{t('skeletonLabel')}</p>
      <div aria-hidden="true" className="space-y-2">
        <div className="h-8 w-40 animate-pulse rounded-control bg-surface-subtle" />
        <div className="h-4 w-full max-w-xl animate-pulse rounded-control bg-surface-subtle" />
      </div>
      <div
        aria-hidden="true"
        className="space-y-stack rounded-card border border-border bg-surface p-section"
      >
        <Skeleton lines={1} />
        <Skeleton lines={1} />
        <div className="grid gap-stack sm:grid-cols-3">
          <Skeleton lines={1} />
          <Skeleton lines={1} />
          <Skeleton lines={1} />
        </div>
        <div className="h-11 w-32 animate-pulse rounded-control bg-surface-subtle" />
      </div>
      <div aria-hidden="true" className="space-y-stack">
        <div className="h-6 w-32 animate-pulse rounded-control bg-surface-subtle" />
        <Skeleton lines={2} />
        <Skeleton lines={2} />
      </div>
    </div>
  )
}

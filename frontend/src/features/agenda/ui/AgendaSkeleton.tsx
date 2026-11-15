import { useTranslation } from 'react-i18next'
import { Skeleton } from '@/shared/ui/Skeleton'

/** Loading layout for the lazy Home agenda route. */
export function AgendaSkeleton() {
  const { t } = useTranslation('agenda')

  return (
    <div className="space-y-section">
      <p className="sr-only">{t('loading.label')}</p>
      <div aria-hidden="true" className="space-y-section">
        <section aria-busy="true" className="space-y-3">
          <Skeleton lines={1} className="max-w-xs" />
          <Skeleton lines={3} />
        </section>
        <section aria-busy="true" className="space-y-3">
          <Skeleton lines={1} className="max-w-sm" />
          <Skeleton lines={4} />
        </section>
        <section aria-busy="true" className="space-y-3">
          <Skeleton lines={1} className="max-w-sm" />
          <Skeleton lines={2} />
        </section>
      </div>
    </div>
  )
}

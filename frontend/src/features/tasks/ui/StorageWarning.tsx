import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import type { PersistenceMode } from '@/entities/task'
import { Button } from '@/shared/ui/Button'

export interface StorageWarningProps {
  mode: PersistenceMode
  pending: boolean
  onRetry: () => void
}

interface WarningCopy {
  heading: string
  description: string
}

function warningCopy(
  mode: Exclude<PersistenceMode, 'normal'>,
  t: TFunction<'tasks'>,
): WarningCopy {
  switch (mode) {
    case 'memory-only':
      return {
        heading: t('storage.memoryOnlyHeading'),
        description: t('storage.memoryOnlyDescription'),
      }
    case 'recovery-blocked':
      return {
        heading: t('storage.recoveryBlockedHeading'),
        description: t('storage.recoveryBlockedDescription'),
      }
    case 'protected':
      return {
        heading: t('storage.protectedHeading'),
        description: t('storage.protectedDescription'),
      }
    case 'unsupported':
      return {
        heading: t('storage.unsupportedHeading'),
        description: t('storage.unsupportedDescription'),
      }
  }
}

export function StorageWarning({
  mode,
  pending,
  onRetry,
}: StorageWarningProps) {
  const { t } = useTranslation('tasks')

  if (mode === 'normal') return null

  const copy = warningCopy(mode, t)

  return (
    <section
      role="alert"
      aria-labelledby="storage-warning-heading"
      className="rounded-2xl border border-warning bg-surface p-5"
    >
      <h2
        id="storage-warning-heading"
        className="text-title font-semibold text-warning"
      >
        {copy.heading}
      </h2>
      <p className="mt-1 text-body text-text">{copy.description}</p>
      {mode === 'memory-only' ? (
        <div className="mt-3">
          <Button variant="primary" disabled={pending} onClick={onRetry}>
            {pending ? t('storage.retrying') : t('storage.retry')}
          </Button>
        </div>
      ) : null}
    </section>
  )
}

import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/ui/Button'
import { ErrorState } from '@/shared/ui/ErrorState'
import { SuccessState } from '@/shared/ui/SuccessState'
import type { CommitmentNotice } from '../model/useCommitments'

export interface CommitmentNoticesProps {
  notice: CommitmentNotice | null
  externalChange: boolean
  pending: boolean
  onReload: () => void
  onRetry: () => void
}

export function CommitmentNotices({
  notice,
  externalChange,
  pending,
  onReload,
  onRetry,
}: CommitmentNoticesProps) {
  const { t } = useTranslation('commitments')
  const showRetry =
    notice?.messageKey === 'commitments.notices.storageUnavailable'

  return (
    <div className="grid gap-3">
      <section
        aria-label={t('commitments.storageWarning.heading')}
        className="rounded-control border border-warning bg-surface-subtle p-control text-caption text-text"
      >
        {t('commitments.guestNotice')}
      </section>

      {notice?.kind === 'success' ? (
        <SuccessState message={t(notice.messageKey)} />
      ) : null}

      {notice && notice.kind !== 'success' ? (
        <div aria-live="polite" role="status">
          <p
            className={
              notice.kind === 'error'
                ? 'text-body font-medium text-danger'
                : 'text-body font-medium text-warning'
            }
          >
            {t(notice.messageKey)}
          </p>
        </div>
      ) : null}

      {externalChange ? (
        <ErrorState
          heading={t('commitments.storageWarning.heading')}
          description={t('commitments.notices.storageBlocked')}
          action={
            <Button variant="primary" onClick={onReload}>
              {t('commitments.reload')}
            </Button>
          }
        />
      ) : null}

      {showRetry ? (
        <div>
          <Button variant="secondary" onClick={onRetry} disabled={pending}>
            {pending ? t('commitments.retrying') : t('commitments.retry')}
          </Button>
        </div>
      ) : null}
    </div>
  )
}

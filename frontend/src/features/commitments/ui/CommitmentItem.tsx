import { useTranslation } from 'react-i18next'
import { findOverlaps, type Commitment } from '@/entities/commitment'
import { formatLocalDate, formatLocalTime } from '@/shared/lib/localDateTime'
import { Button } from '@/shared/ui/Button'

export interface CommitmentItemProps {
  commitment: Commitment
  commitments: Commitment[]
  formattingLocale: string
  dateStyle: Intl.DateTimeFormatOptions['dateStyle']
  disabled: boolean
  onEdit: (_commitment: Commitment) => void
  onDelete: (_commitment: Commitment) => void
}

export function CommitmentItem({
  commitment,
  commitments,
  formattingLocale,
  dateStyle,
  disabled,
  onEdit,
  onDelete,
}: CommitmentItemProps) {
  const { t } = useTranslation('commitments')
  const overlap = findOverlaps(commitment, commitments)
  const conflictTitles = overlap.conflictingCommitments
    .map((item) => item.title)
    .join(', ')

  return (
    <li
      data-commitment-id={commitment.id}
      tabIndex={-1}
      className="rounded-card border border-border bg-surface p-section shadow-card"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-body font-semibold text-text">
            {commitment.title}
          </h3>
          <p className="mt-1 text-caption text-text-muted">
            {formatLocalDate(commitment.date, formattingLocale, dateStyle)} ·{' '}
            {formatLocalTime(commitment.startTime, formattingLocale)}–
            {formatLocalTime(commitment.endTime, formattingLocale)}
          </p>
          <p className="mt-1 text-caption text-text">
            <span className="font-medium">
              {commitment.type === 'fixed'
                ? t('commitments.form.typeFixed')
                : t('commitments.form.typeFlexible')}
            </span>{' '}
            —{' '}
            {commitment.type === 'fixed'
              ? t('commitments.form.typeFixedDesc')
              : t('commitments.form.typeFlexibleDesc')}
          </p>
          {commitment.description ? (
            <p className="mt-2 text-body text-text">{commitment.description}</p>
          ) : null}
          {overlap.overlaps ? (
            <p className="mt-2 text-caption font-medium text-warning">
              {t('commitments.overlap.conflictWith', {
                titles: conflictTitles,
              })}
            </p>
          ) : null}
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            disabled={disabled}
            aria-label={`${t('commitments.edit')}: ${commitment.title}`}
            onClick={() => onEdit(commitment)}
          >
            {t('commitments.edit')}
          </Button>
          <Button
            variant="danger"
            disabled={disabled}
            aria-label={`${t('commitments.delete')}: ${commitment.title}`}
            onClick={() => onDelete(commitment)}
          >
            {t('commitments.delete')}
          </Button>
        </div>
      </div>
    </li>
  )
}

import { useTranslation } from 'react-i18next'
import { findOverlaps, type Commitment } from '@/entities/commitment'
import { formatLocalDate, formatLocalTime } from '@/shared/lib/localDateTime'
import { RowActions, type RowActionView } from '@/shared/ui/RowActions'

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

  const actions: RowActionView[] = [
    {
      id: 'edit',
      label: `${t('commitments.edit')}: ${commitment.title}`,
      onSelect: () => {
        if (!disabled) onEdit(commitment)
      },
    },
    {
      id: 'delete',
      label: `${t('commitments.delete')}: ${commitment.title}`,
      onSelect: () => {
        if (!disabled) onDelete(commitment)
      },
      tone: 'danger',
    },
  ]

  return (
    <li
      data-commitment-id={commitment.id}
      tabIndex={-1}
      className="group rounded-2xl border border-border bg-surface p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="break-words text-body font-semibold text-text">
            {commitment.title}
          </h3>
          <p className="mt-1 text-caption text-text-muted">
            {formatLocalDate(commitment.date, formattingLocale, dateStyle)} ·{' '}
            <span className="tabular-nums">
              {formatLocalTime(commitment.startTime, formattingLocale)}–
              {formatLocalTime(commitment.endTime, formattingLocale)}
            </span>
          </p>
          <p className="mt-1 text-caption text-text">
            <span className="inline-flex items-center rounded-full border border-tag-border px-2 py-0.5 font-medium text-tag-text">
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
        <RowActions
          menuLabel={t('actions.menuLabel', {
            title: commitment.title,
            ns: 'common',
          })}
          actions={actions}
        />
      </div>
    </li>
  )
}

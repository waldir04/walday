import { useTranslation } from 'react-i18next'
import type { Commitment } from '@/entities/commitment'
import { Button } from '@/shared/ui/Button'
import { EmptyState } from '@/shared/ui/EmptyState'
import { CommitmentItem } from './CommitmentItem'

export interface CommitmentListProps {
  commitments: Commitment[]
  allCommitments: Commitment[]
  formattingLocale: string
  dateStyle: Intl.DateTimeFormatOptions['dateStyle']
  disabled: boolean
  onCreateRequested: () => void
  onEdit: (_commitment: Commitment) => void
  onDelete: (_commitment: Commitment) => void
}

export function CommitmentList({
  commitments,
  allCommitments,
  formattingLocale,
  dateStyle,
  disabled,
  onCreateRequested,
  onEdit,
  onDelete,
}: CommitmentListProps) {
  const { t } = useTranslation('commitments')

  if (commitments.length === 0) {
    return (
      <EmptyState
        heading={t('commitments.emptyHeading')}
        description={t('commitments.emptyDescription')}
        action={
          <Button
            id="commitment-empty-action"
            variant="primary"
            onClick={onCreateRequested}
          >
            {t('commitments.emptyAction')}
          </Button>
        }
      />
    )
  }

  return (
    <ul className="space-y-3">
      {commitments.map((commitment) => (
        <CommitmentItem
          key={commitment.id}
          commitment={commitment}
          commitments={allCommitments}
          formattingLocale={formattingLocale}
          dateStyle={dateStyle}
          disabled={disabled}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </ul>
  )
}

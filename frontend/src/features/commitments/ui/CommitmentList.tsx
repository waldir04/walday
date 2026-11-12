import { useTranslation } from 'react-i18next'
import type { Commitment } from '@/entities/commitment'
import { CommitmentItem } from './CommitmentItem'

interface Props {
  commitments: Commitment[]
  onEdit: (_commitment: Commitment) => void
  onDelete: (_id: string) => void
}

export function CommitmentList({ commitments, onEdit, onDelete }: Props) {
  const { t } = useTranslation('commitments')

  if (commitments.length === 0) {
    return (
      <section className="mt-6 text-center py-8 text-gray-500">
        <p>{t('commitments.empty')}</p>
      </section>
    )
  }

  const sorted = [...commitments].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1
    return a.startTime < b.startTime ? -1 : 1
  })

  return (
    <section className="mt-6 space-y-2" aria-label={t('commitments.heading')}>
      {sorted.map((commitment) => (
        <CommitmentItem
          key={commitment.id}
          commitment={commitment}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </section>
  )
}

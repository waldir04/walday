import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { Commitment } from '@/entities/commitment'

interface Props {
  commitment: Commitment
  onEdit: (_commitment: Commitment) => void
  onDelete: (_id: string) => void
}

export function CommitmentItem({ commitment, onEdit, onDelete }: Props) {
  const { t } = useTranslation('commitments')
  const isFixed = commitment.type === 'fixed'

  return (
    <article className="rounded border border-gray-200 p-4 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 mb-2">
        <Link
          to={`/commitments/${commitment.id}/edit`}
          className="text-sm font-semibold text-gray-900 hover:underline"
        >
          {commitment.title}
        </Link>
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${
            isFixed
              ? 'border-blue-200 bg-blue-50 text-blue-700'
              : 'border-green-200 bg-green-50 text-green-700'
          }`}
        >
          {isFixed ? t('commitments.typeFixed') : t('commitments.typeFlexible')}
        </span>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-gray-600">
        <dt className="font-medium text-gray-900">{t('commitments.date')}</dt>
        <dd>{commitment.date}</dd>
        <dt className="font-medium text-gray-900">
          {t('commitments.startTime')}
        </dt>
        <dd>{commitment.startTime}</dd>
        <dt className="font-medium text-gray-900">
          {t('commitments.endTime')}
        </dt>
        <dd>{commitment.endTime}</dd>
        {commitment.description ? (
          <>
            <dt className="font-medium text-gray-900">
              {t('commitments.description')}
            </dt>
            <dd className="col-span-2">{commitment.description}</dd>
          </>
        ) : null}
      </dl>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => onEdit(commitment)}
          className="flex-1 rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
        >
          {t('commitments.edit')}
        </button>
        <button
          type="button"
          onClick={() => onDelete(commitment.id)}
          className="rounded border border-red-200 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50"
        >
          {t('commitments.delete')}
        </button>
      </div>
    </article>
  )
}

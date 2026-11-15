import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/ui/Button'

export interface AgendaEmptyStateProps {
  dateLabel: string
  onCreateCommitment: () => void
  onCreateTask: () => void
}

export function AgendaEmptyState({
  dateLabel,
  onCreateCommitment,
  onCreateTask,
}: AgendaEmptyStateProps) {
  const { t } = useTranslation('agenda')

  return (
    <section
      aria-labelledby="agenda-empty-heading"
      className="rounded-2xl border border-border bg-surface p-5 text-center"
    >
      <h2
        id="agenda-empty-heading"
        className="text-title font-semibold text-text"
      >
        {t('emptyDay.heading', { date: dateLabel })}
      </h2>
      <p className="mt-2 text-body text-text-muted">
        {t('emptyDay.description')}
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <Button variant="secondary" onClick={onCreateCommitment}>
          {t('emptyDay.createCommitment')}
        </Button>
        <Button variant="secondary" onClick={onCreateTask}>
          {t('emptyDay.createTask')}
        </Button>
      </div>
    </section>
  )
}

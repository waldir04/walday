import { useTranslation } from 'react-i18next'
import { formatDueDate, isLocalDate, type Task } from '@/entities/task'
import { Button } from '@/shared/ui/Button'
import { Link } from '@/shared/ui/Link'
import type { AgendaSchedulingState } from '../model/types'

export interface AgendaUnscheduledListProps {
  tasks: Task[]
  locale: string
  dateStyle: Intl.DateTimeFormatOptions['dateStyle']
  onOpenTasks: () => void
  onSchedule: (_taskId: string) => void
  scheduling: AgendaSchedulingState
  pending: boolean
}

export function AgendaUnscheduledList({
  tasks,
  locale,
  dateStyle,
  onOpenTasks,
  onSchedule,
  scheduling,
  pending,
}: AgendaUnscheduledListProps) {
  const { t } = useTranslation('agenda')

  return (
    <section aria-labelledby="agenda-unscheduled-heading" className="space-y-3">
      <h2
        id="agenda-unscheduled-heading"
        className="text-title font-semibold text-text"
      >
        {t('headings.unscheduled')}
      </h2>
      <p className="text-caption text-text-muted">
        {t('unscheduled.noAssignedTime')}
      </p>

      {tasks.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-5">
          <p className="text-body text-text-muted">{t('unscheduled.empty')}</p>
          <div className="mt-3">
            <Button variant="secondary" onClick={onOpenTasks}>
              {t('unscheduled.openTasks')}
            </Button>
          </div>
        </div>
      ) : (
        <ul className="space-y-3">
          {tasks.map((task) => (
            <li
              key={task.id}
              className="rounded-2xl border border-border bg-surface p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="break-words text-body font-semibold text-text">
                    {task.title}
                  </h3>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-text-muted">
                    <span className="inline-flex items-center rounded-full border border-tag-border px-2 py-0.5 text-tag-text">
                      {t(`form.priorityOptions.${task.priority}`, {
                        ns: 'tasks',
                      })}
                    </span>
                    <span>
                      {task.status === 'completed'
                        ? t('entry.completed')
                        : t('entry.pending')}
                    </span>
                    {task.dueDate && isLocalDate(task.dueDate) ? (
                      <span>
                        {formatDueDate(task.dueDate, locale, dateStyle)}
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Button
                    variant="secondary"
                    disabled={pending || !scheduling.enabled}
                    onClick={() => onSchedule(task.id)}
                  >
                    {t('actions.schedule')}
                  </Button>
                  {!scheduling.enabled && scheduling.reasonKey ? (
                    <p className="max-w-56 text-right text-caption text-text-muted">
                      {t('scheduling.unavailable', {
                        reason: t(scheduling.reasonKey),
                      })}{' '}
                      <Link to="/tasks">{t('scheduling.tasksLink')}</Link>
                    </p>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

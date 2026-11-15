import { useTranslation } from 'react-i18next'
import {
  formatDueDate,
  formatDuration,
  isLocalDate,
  isPastDue,
  type Task,
} from '@/entities/task'

export interface TaskMetadataProps {
  task: Task
  formattingLocale?: string
  dateStyle?: Intl.DateTimeFormatOptions['dateStyle']
}

export function TaskMetadata({
  task,
  formattingLocale,
  dateStyle = 'medium',
}: TaskMetadataProps) {
  const { t, i18n } = useTranslation('tasks')
  const locale = formattingLocale ?? i18n.language

  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-text-muted">
      <span className="inline-flex items-center rounded-full border border-tag-border px-2 py-0.5 text-tag-text">
        {t('item.priority', {
          priority: t(`form.priorityOptions.${task.priority}`),
        })}
      </span>
      <span className="inline-flex items-center rounded-full border border-tag-border px-2 py-0.5 text-tag-text">
        {task.status === 'completed'
          ? t('item.statusCompleted')
          : t('item.statusPending')}
      </span>
      {task.dueDate && isLocalDate(task.dueDate) ? (
        <span>
          {t('item.due', {
            date: formatDueDate(task.dueDate, locale, dateStyle),
          })}
        </span>
      ) : null}
      {task.estimatedMinutes !== undefined ? (
        <span>
          {t('item.duration', {
            duration: formatDuration(task.estimatedMinutes, locale),
          })}
        </span>
      ) : null}
      {isPastDue(task) ? (
        <span className="font-medium text-danger">{t('item.pastDue')}</span>
      ) : null}
    </div>
  )
}

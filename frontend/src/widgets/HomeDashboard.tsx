import { useTranslation } from 'react-i18next'
import {
  formatDueDate,
  formatDuration,
  groupTasks,
  isLocalDate,
  type Task,
} from '@/entities/task'
import type { Commitment } from '@/entities/commitment'
import type { WeatherUnit } from '@/entities/preferences'
import { formatLocalTime } from '@/shared/lib/localDateTime'
import { EmptyState } from '@/shared/ui/EmptyState'
import { Link } from '@/shared/ui/Link'
import {
  SmartSuggestions,
  type SmartSuggestionsState,
} from './SmartSuggestions'
import { WeatherCard, type WeatherCardState } from './WeatherCard'

export interface HomeDashboardProps {
  tasks: Task[]
  todayCommitments: Commitment[]
  taskCounts: { pending: number; completed: number }
  weather: WeatherCardState
  suggestions: SmartSuggestionsState
  formattingLocale: string
  dateStyle: Intl.DateTimeFormatOptions['dateStyle']
  weatherUnit: WeatherUnit
  todayLabel: string
}

export function HomeDashboard({
  tasks,
  todayCommitments,
  taskCounts,
  weather,
  suggestions,
  formattingLocale,
  dateStyle,
  weatherUnit,
  todayLabel,
}: HomeDashboardProps) {
  const { t } = useTranslation('home')
  const groups = groupTasks(tasks)

  return (
    <div className="space-y-section">
      <div className="space-y-2">
        <p className="text-caption font-medium uppercase tracking-wide text-primary">
          {todayLabel}
        </p>
        <h1 tabIndex={-1} className="text-display font-bold text-text">
          {t('heading')}
        </h1>
        <p className="text-body text-text-muted">{t('description')}</p>
      </div>

      <WeatherCard
        state={weather}
        unit={weatherUnit}
        locale={formattingLocale}
      />

      <SmartSuggestions state={suggestions} />

      <section aria-labelledby="home-commitments-heading" className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2
            id="home-commitments-heading"
            className="text-title font-semibold text-text"
          >
            {t('commitments.heading')}
          </h2>
          <Link to="/commitments" variant="navigation">
            {t('commitments.viewAll')}
          </Link>
        </div>

        {todayCommitments.length === 0 ? (
          <EmptyState
            heading={t('commitments.emptyHeading')}
            description={t('commitments.emptyDescription')}
            action={
              <Link to="/commitments">{t('commitments.emptyAction')}</Link>
            }
          />
        ) : (
          <ul className="space-y-3">
            {todayCommitments.map((commitment) => (
              <li
                key={commitment.id}
                className="rounded-2xl border border-border bg-surface p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="break-words text-body font-semibold text-text">
                      {commitment.title}
                    </p>
                    <p className="mt-1 text-caption tabular-nums text-text-muted">
                      {formatLocalTime(commitment.startTime, formattingLocale)}{' '}
                      – {formatLocalTime(commitment.endTime, formattingLocale)}
                    </p>
                  </div>
                  <span className="inline-flex items-center rounded-full border border-tag-border px-2 py-0.5 text-caption text-tag-text">
                    {commitment.type === 'fixed'
                      ? t('form.typeFixed', { ns: 'commitments' })
                      : t('form.typeFlexible', { ns: 'commitments' })}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="home-tasks-heading" className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2
            id="home-tasks-heading"
            className="text-title font-semibold text-text"
          >
            {t('tasks.heading')}
          </h2>
          <Link to="/tasks" variant="navigation">
            {t('tasks.viewAll')}
          </Link>
        </div>

        <p className="text-caption text-text-muted">
          {t('tasks.pending', { count: taskCounts.pending })} ·{' '}
          {t('tasks.completed', { count: taskCounts.completed })}
        </p>

        {tasks.length === 0 ? (
          <EmptyState
            heading={t('tasks.emptyHeading')}
            description={t('tasks.emptyDescription')}
            action={<Link to="/tasks">{t('tasks.emptyAction')}</Link>}
          />
        ) : (
          <div className="space-y-section">
            {(
              [
                ['pending', groups.pending],
                ['completed', groups.completed],
              ] as const
            ).map(([group, items]) =>
              items.length === 0 ? null : (
                <ul
                  key={group}
                  aria-label={
                    group === 'pending'
                      ? t('tasks.pending', { count: items.length })
                      : t('tasks.completed', { count: items.length })
                  }
                  className="space-y-3"
                >
                  {items.map((task) => (
                    <li
                      key={task.id}
                      className="rounded-2xl border border-border bg-surface p-5"
                    >
                      <p
                        className={
                          task.status === 'completed'
                            ? 'break-words text-body text-text-muted line-through'
                            : 'break-words text-body font-medium text-text'
                        }
                      >
                        {task.title}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-text-muted">
                        <span className="inline-flex items-center rounded-full border border-tag-border px-2 py-0.5 text-tag-text">
                          {t(`form.priorityOptions.${task.priority}`, {
                            ns: 'tasks',
                          })}
                        </span>
                        <span className="inline-flex items-center rounded-full border border-tag-border px-2 py-0.5 text-tag-text">
                          {task.status === 'completed'
                            ? t('item.statusCompleted', { ns: 'tasks' })
                            : t('item.statusPending', { ns: 'tasks' })}
                        </span>
                        {task.dueDate && isLocalDate(task.dueDate) ? (
                          <span>
                            {t('item.due', {
                              ns: 'tasks',
                              date: formatDueDate(
                                task.dueDate,
                                formattingLocale,
                                dateStyle,
                              ),
                            })}
                          </span>
                        ) : null}
                        {task.estimatedMinutes !== undefined ? (
                          <span>
                            {t('item.duration', {
                              ns: 'tasks',
                              duration: formatDuration(
                                task.estimatedMinutes,
                                formattingLocale,
                              ),
                            })}
                          </span>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              ),
            )}
          </div>
        )}
      </section>
    </div>
  )
}

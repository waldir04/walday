import { useTranslation } from 'react-i18next'
import { commitmentsForDate, orderedCommitments } from '@/entities/commitment'
import { groupTasks } from '@/entities/task'
import { resolveDateStyle, usePreferences } from '@/entities/preferences'
import { formatLocalDate, getLocalToday } from '@/shared/lib/localDateTime'
// eslint-disable-next-line no-restricted-imports -- narrow controller entry keeps task UI out of the initial bundle.
import { useTasks } from '@/features/tasks/controller'
// eslint-disable-next-line no-restricted-imports -- narrow controller entry keeps commitment UI out of the initial bundle.
import { useCommitments } from '@/features/commitments/controller'
import { Link } from '@/shared/ui/Link'
import { HomeDashboard } from '@/widgets/HomeDashboard'
import type { SmartSuggestionsState } from '@/widgets/SmartSuggestions'
import type { WeatherCardState } from '@/widgets/WeatherCard'

const TASK_NOTICE_MODES = new Set([
  'recovery-blocked',
  'protected',
  'unsupported',
  'memory-only',
])

const COMMITMENT_NOTICE_MODES = new Set(['recovery-blocked', 'unsupported'])

export function HomePage() {
  const { t, i18n } = useTranslation('home')
  const { preferences, formattingLocale } = usePreferences()
  const tasks = useTasks()
  const commitments = useCommitments()

  const dateStyle = resolveDateStyle(preferences.dateTimePresentation)
  const today = getLocalToday()
  const todayLabel = formatLocalDate(today, formattingLocale, dateStyle)
  const todayCommitments = orderedCommitments(
    commitmentsForDate(commitments.commitments, today),
    i18n.language,
  )
  const groups = groupTasks(tasks.tasks)

  const weather: WeatherCardState = preferences.weatherLocation
    ? { status: 'unavailable' }
    : { status: 'no-location' }
  const suggestions: SmartSuggestionsState = {
    status: 'ready',
    suggestions: [],
  }

  const tasksNeedAttention = TASK_NOTICE_MODES.has(tasks.mode)
  const commitmentsNeedAttention = COMMITMENT_NOTICE_MODES.has(commitments.mode)

  return (
    <div className="space-y-section">
      {tasksNeedAttention || commitmentsNeedAttention ? (
        <section
          role="status"
          aria-labelledby="home-storage-notice-heading"
          className="space-y-2 rounded-2xl border border-warning bg-surface p-5"
        >
          <h2
            id="home-storage-notice-heading"
            className="text-body font-semibold text-warning"
          >
            {t('storageNotice.heading')}
          </h2>
          <p className="text-caption text-text-muted">
            {t('storageNotice.description')}
          </p>
          <p className="flex flex-wrap gap-3 text-caption">
            {tasksNeedAttention ? (
              <Link to="/tasks">{t('storageNotice.tasksLink')}</Link>
            ) : null}
            {commitmentsNeedAttention ? (
              <Link to="/commitments">
                {t('storageNotice.commitmentsLink')}
              </Link>
            ) : null}
          </p>
        </section>
      ) : null}

      <HomeDashboard
        tasks={tasks.tasks}
        todayCommitments={todayCommitments}
        taskCounts={{
          pending: groups.pending.length,
          completed: groups.completed.length,
        }}
        weather={weather}
        suggestions={suggestions}
        formattingLocale={formattingLocale}
        dateStyle={dateStyle}
        weatherUnit={preferences.weatherUnits}
        todayLabel={todayLabel}
      />
    </div>
  )
}

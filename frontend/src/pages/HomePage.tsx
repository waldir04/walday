import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { formatDuration } from '@/entities/task'
import type { TFunction } from 'i18next'
import { resolveDateStyle, usePreferences } from '@/entities/preferences'
// eslint-disable-next-line no-restricted-imports -- narrow controller entry keeps agenda UI out of the initial bundle.
import {
  buildAgendaDay,
  useAgendaDate,
  validateScheduleDraft,
  scheduleConflicts,
  type AgendaDay,
  type ScheduleDraft,
} from '@/features/agenda/controller'
import {
  AgendaIncompleteNotice,
  DailyAgenda,
  RemoveScheduleDialog,
  ScheduleTaskDialog,
} from '@/features/agenda'
import { useNow } from '@/shared/lib/useNow'
import {
  formatLocalDate,
  getLocalToday,
  isLocalTime,
  minuteOfDayRoundedUp,
  parseLocalTime,
} from '@/shared/lib/localDateTime'
// eslint-disable-next-line no-restricted-imports -- narrow controller entry keeps task UI out of the initial bundle.
import { useTasks } from '@/features/tasks/controller'
import { RecoveryNotice, StorageWarning } from '@/features/tasks'
// eslint-disable-next-line no-restricted-imports -- narrow controller entry keeps commitment UI out of the initial bundle.
import { useCommitments } from '@/features/commitments/controller'
import { Link } from '@/shared/ui/Link'
import { useWeather, useWeatherAnnouncements } from '@/features/weather'
import { HomeDashboard } from '@/widgets/HomeDashboard'
// eslint-disable-next-line no-restricted-imports -- narrow controller entry keeps suggestion UI out of the initial bundle.
import { useSuggestions } from '@/features/suggestions/controller'
import {
  buildWeatherContext,
  type SuggestionConflictLink,
} from '@/features/suggestions'

const COMMITMENT_NOTICE_MODES = new Set(['recovery-blocked', 'unsupported'])

type ScheduleDialogState = {
  mode: 'create' | 'move'
  taskId: string
}

export function HomePage() {
  const { t } = useTranslation('home')
  const { t: tAgenda } = useTranslation('agenda')
  const navigate = useNavigate()
  const { preferences, formattingLocale, timeZone } = usePreferences()
  const tasks = useTasks()
  const commitments = useCommitments()
  const { date: selectedDate, today, selectDate } = useAgendaDate()
  const now = useNow()

  const dateStyle = resolveDateStyle(preferences.dateTimePresentation)
  const selectedDateLabel = formatLocalDate(
    selectedDate,
    formattingLocale,
    dateStyle,
  )

  const tasksIncomplete =
    tasks.quarantine !== null ||
    tasks.unsupported ||
    tasks.mode === 'recovery-blocked' ||
    tasks.mode === 'protected'
  const commitmentsIncomplete =
    !commitments.ready ||
    commitments.quarantine !== null ||
    commitments.unsupported ||
    commitments.mode === 'recovery-blocked'
  const sources =
    tasksIncomplete || commitmentsIncomplete ? 'incomplete' : 'complete'

  const day = useMemo(
    () =>
      buildAgendaDay({
        date: selectedDate,
        tasks: tasks.tasks,
        commitments: commitments.commitments,
        now,
        locale: formattingLocale,
        sources,
      }),
    [
      tasks.tasks,
      commitments.commitments,
      selectedDate,
      now,
      formattingLocale,
      sources,
    ],
  )

  const [liveMessage, setLiveMessage] = useState<string | null>(null)
  const dateSignatureRef = useRef<string | null>(null)
  const dataSignatureRef = useRef<string | null>(null)
  const holdMessageRef = useRef(false)

  const summary = useMemo(
    () => summaryMessage(day, selectedDateLabel, formattingLocale, tAgenda),
    [day, selectedDateLabel, formattingLocale, tAgenda],
  )

  useEffect(() => {
    if (dateSignatureRef.current === null) {
      dateSignatureRef.current = selectedDate
      dataSignatureRef.current = summary
      return
    }
    if (dateSignatureRef.current !== selectedDate) {
      dateSignatureRef.current = selectedDate
      dataSignatureRef.current = summary
      holdMessageRef.current = false
      setLiveMessage(summary)
    }
  }, [selectedDate, summary])

  useEffect(() => {
    if (dataSignatureRef.current === null) {
      dataSignatureRef.current = summary
      return
    }
    if (holdMessageRef.current) return
    if (dataSignatureRef.current !== summary) {
      dataSignatureRef.current = summary
      setLiveMessage(summary)
    }
  }, [summary])

  const [dialog, setDialog] = useState<ScheduleDialogState | null>(null)
  const [removeTarget, setRemoveTarget] = useState<string | null>(null)
  const dialogTask = dialog
    ? tasks.tasks.find((task) => task.id === dialog.taskId)
    : undefined
  const removeTask = removeTarget
    ? tasks.tasks.find((task) => task.id === removeTarget)
    : undefined

  const weather = useWeather({
    location: preferences.weatherLocation,
    locale: formattingLocale,
    timeZone,
  })
  const weatherAnnouncement = useWeatherAnnouncements({
    state: weather.state,
    isManualRefreshing: weather.isManualRefreshing,
    manualRefreshOutcome: weather.manualRefreshOutcome,
    locale: formattingLocale,
  })

  const suggestionSources = !commitments.ready
    ? 'loading'
    : tasksIncomplete || commitmentsIncomplete
      ? 'incomplete'
      : 'complete'

  const weatherPort = useMemo(
    () =>
      buildWeatherContext({
        hours:
          weather.state.status === 'ready'
            ? weather.state.hours.map((hour) => ({
                timeMs: hour.timeMs,
                condition: hour.condition,
                precipitationProbability: hour.precipitationProbability,
              }))
            : [],
        today: getLocalToday(now),
        isReady: weather.state.status === 'ready',
        isOutdated:
          weather.state.status === 'ready'
            ? weather.state.freshness.isOutdated
            : false,
      }),
    [weather.state, now],
  )

  async function applySuggestionTaskSlot(input: {
    taskId: string
    startTime: string
    durationMinutes: number
    acknowledged: boolean
  }): Promise<{ ok: true } | { ok: false; reason: string }> {
    const validation = validateScheduleDraft(
      {
        taskId: input.taskId,
        date: day.date,
        startTime: input.startTime,
        durationInput: String(input.durationMinutes),
        acknowledgedConflicts: input.acknowledged,
      },
      { tasks: tasks.tasks, day, date: day.date },
    )
    if (!validation.ok) {
      return {
        ok: false,
        reason: validation.errors[0]?.code ?? 'invalid-time',
      }
    }
    const saved = await tasks.scheduleTask(input.taskId, validation.slot)
    return saved ? { ok: true } : { ok: false, reason: 'apply-failed' }
  }

  async function applySuggestionCommitmentMove(input: {
    commitmentId: string
    startTime: string
    endTime: string
    acknowledged: boolean
  }): Promise<{ ok: true } | { ok: false; reason: string }> {
    const commitment = commitments.commitments.find(
      (candidate) => candidate.id === input.commitmentId,
    )
    if (!commitment) return { ok: false, reason: 'missing' }

    const result = await commitments.update(
      commitment.id,
      {
        title: commitment.title,
        description: commitment.description ?? '',
        date: commitment.date,
        startTime: input.startTime,
        endTime: input.endTime,
        type: commitment.type,
      },
      input.acknowledged,
    )
    return result.ok ? { ok: true } : { ok: false, reason: result.reason }
  }

  const suggestions = useSuggestions({
    day,
    tasks: tasks.tasks,
    commitments: commitments.commitments,
    sources: suggestionSources,
    weather: weatherPort,
    now,
    applyTaskSlot: applySuggestionTaskSlot,
    applyCommitmentMove: applySuggestionCommitmentMove,
    locale: formattingLocale,
    dateStyle,
    weatherUnit: preferences.weatherUnits,
  })

  function suggestionConflictsFor(
    activityKey: string,
    startTime: string,
  ): SuggestionConflictLink[] {
    if (!isLocalTime(startTime)) return []
    const parsed = parseLocalTime(startTime)
    if (!parsed) return []

    const view =
      suggestions.state.status === 'ready'
        ? [
            ...suggestions.state.suggestions,
            ...suggestions.state.dismissed,
          ].find((candidate) => candidate.activityKey === activityKey)
        : undefined
    const duration = view?.durationMinutes ?? 0
    if (duration < 1) return []

    const start = parsed.hours * 60 + parsed.minutes
    const end = start + duration
    const links: SuggestionConflictLink[] = []

    for (const entry of day.entries) {
      const entryKey =
        entry.category === 'task'
          ? `task:${entry.sourceId}`
          : `commitment:${entry.sourceId}`
      if (entryKey === activityKey) continue
      if (start < entry.endMinutes && entry.startMinutes < end) {
        links.push({
          title: entry.title,
          startMinutes: Math.max(start, entry.startMinutes),
          endMinutes: Math.min(end, entry.endMinutes),
        })
      }
    }

    return links
  }

  const commitmentsNeedAttention = COMMITMENT_NOTICE_MODES.has(commitments.mode)

  function openSchedule(taskId: string): void {
    const task = tasks.tasks.find((candidate) => candidate.id === taskId)
    if (!task) return
    setRemoveTarget(null)
    setDialog({ mode: task.plannedDate ? 'move' : 'create', taskId })
  }

  function openRemove(taskId: string): void {
    setDialog(null)
    setRemoveTarget(taskId)
  }

  async function confirmSchedule(draft: ScheduleDraft): Promise<boolean> {
    if (!dialogTask) return false
    const validation = validateScheduleDraft(draft, {
      tasks: tasks.tasks,
      day,
      date: selectedDate,
    })
    if (!validation.ok) {
      setLiveMessage(tAgenda('announcement.failed'))
      return false
    }

    const saved = await tasks.scheduleTask(dialogTask.id, validation.slot)
    holdMessageRef.current = saved
    setLiveMessage(
      saved
        ? tAgenda(
            dialog?.mode === 'move'
              ? 'announcement.moved'
              : 'announcement.scheduled',
          )
        : tAgenda('announcement.failed'),
    )
    return saved
  }

  async function confirmRemove(): Promise<boolean> {
    if (!removeTask) return false
    const saved = await tasks.unscheduleTask(removeTask.id)
    holdMessageRef.current = saved
    setLiveMessage(
      saved
        ? tAgenda('announcement.unscheduled')
        : tAgenda('announcement.failed'),
    )
    return saved
  }

  return (
    <div className="space-y-section">
      <StorageWarning
        mode={tasks.mode}
        pending={tasks.pending}
        onRetry={() => {
          void tasks.retryPersistence()
        }}
      />

      <RecoveryNotice
        quarantine={tasks.quarantine}
        unsupported={tasks.unsupported}
        pending={tasks.pending}
        onDiscard={() => {
          void tasks.discardUnreadable()
        }}
        onCancelDiscard={tasks.protectStore}
        onDialogActiveChange={tasks.reportDialogActive}
      />

      {tasksNeedAttention(tasks.mode) || commitmentsNeedAttention ? (
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
            {tasksNeedAttention(tasks.mode) ? (
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

      {sources === 'incomplete' ? <AgendaIncompleteNotice /> : null}

      <HomeDashboard
        agenda={
          <DailyAgenda
            day={day}
            selectedDate={selectedDate}
            today={today}
            locale={formattingLocale}
            dateStyle={dateStyle}
            scheduling={{
              enabled: !tasks.externalChange,
              reasonKey: tasks.externalChange
                ? 'scheduling.reasonExternal'
                : null,
            }}
            pending={tasks.pending}
            onSelectDate={selectDate}
            onSchedule={openSchedule}
            onAdjust={openSchedule}
            onUnschedule={openRemove}
            onOpenTasks={() => navigate('/tasks')}
            onOpenCommitments={() => navigate('/commitments')}
            onCreateTask={() => navigate('/tasks')}
            onCreateCommitment={() => navigate('/commitments')}
            liveMessage={liveMessage}
          />
        }
        selectedDateLabel={selectedDateLabel}
        showTodaySurfaces={selectedDate === today}
        weather={weather.state}
        suggestions={suggestions.state}
        formattingLocale={formattingLocale}
        dateStyle={dateStyle}
        weatherUnit={preferences.weatherUnits}
        weatherAnnouncement={weatherAnnouncement}
        onRefreshWeather={weather.refresh}
        onRetryWeather={weather.refresh}
        onAcceptSuggestion={async (suggestionId) => {
          await suggestions.accept(suggestionId)
        }}
        onAdjustSuggestion={(input) => suggestions.adjust(input)}
        onDismissSuggestion={(suggestionId) =>
          suggestions.dismiss(suggestionId)
        }
        onRestoreSuggestion={(suggestionId) =>
          suggestions.restore(suggestionId)
        }
        onRetrySuggestions={() => {
          suggestions.retry()
          void tasks.retryPersistence()
          commitments.reload()
        }}
        suggestionConflictsFor={suggestionConflictsFor}
        suggestionNowMinutes={minuteOfDayRoundedUp(now)}
      />

      {dialog && dialogTask ? (
        <ScheduleTaskDialog
          open
          mode={dialog.mode}
          task={dialogTask}
          date={selectedDate}
          locale={formattingLocale}
          dateStyle={dateStyle}
          initialStartTime={
            dialog.mode === 'move'
              ? (dialogTask.plannedStartTime ?? null)
              : null
          }
          initialDurationInput=""
          conflictsFor={(startTime) =>
            scheduleConflicts(
              day.entries,
              dialogTask.id,
              startTime,
              dialogTask.estimatedMinutes ?? 0,
            )
          }
          pending={tasks.pending}
          onConfirm={confirmSchedule}
          onClose={() => setDialog(null)}
        />
      ) : null}

      {removeTarget && removeTask ? (
        <RemoveScheduleDialog
          open
          taskTitle={removeTask.title}
          pending={tasks.pending}
          onConfirm={confirmRemove}
          onClose={() => setRemoveTarget(null)}
        />
      ) : null}
    </div>
  )
}

function tasksNeedAttention(mode: string): boolean {
  return (
    mode === 'recovery-blocked' ||
    mode === 'protected' ||
    mode === 'unsupported' ||
    mode === 'memory-only'
  )
}

function summaryMessage(
  day: AgendaDay,
  dateLabel: string,
  locale: string,
  t: TFunction<'agenda'>,
): string {
  const conflicts = day.conflicts?.length ?? 0
  const available =
    day.availability.kind === 'available'
      ? formatDuration(day.availability.totalMinutes, locale)
      : formatDuration(0, locale)
  return t('announcement.summary', {
    date: dateLabel,
    count: day.entries.length,
    conflicts,
    duration: available,
  })
}

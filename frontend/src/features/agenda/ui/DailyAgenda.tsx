import { formatLocalDate, type LocalDate } from '@/shared/lib/localDateTime'
import { AgendaAvailability } from './AgendaAvailability'
import { AgendaConflictSummary } from './AgendaConflictSummary'
import { AgendaDateNav } from './AgendaDateNav'
import { AgendaEmptyState } from './AgendaEmptyState'
import { AgendaLiveRegion } from './AgendaLiveRegion'
import { AgendaTimeline } from './AgendaTimeline'
import { AgendaUnscheduledList } from './AgendaUnscheduledList'
import type { AgendaDay, AgendaSchedulingState } from '../model/types'

export interface DailyAgendaProps {
  day: AgendaDay
  selectedDate: LocalDate
  today: LocalDate
  locale: string
  dateStyle: Intl.DateTimeFormatOptions['dateStyle']
  scheduling: AgendaSchedulingState
  pending: boolean
  onSelectDate: (_date: LocalDate) => void
  onSchedule: (_taskId: string) => void
  onAdjust: (_taskId: string) => void
  onUnschedule: (_taskId: string) => void
  onOpenTasks: () => void
  onOpenCommitments: () => void
  onCreateTask: () => void
  onCreateCommitment: () => void
  liveMessage: string | null
}

export function DailyAgenda({
  day,
  selectedDate,
  today,
  locale,
  dateStyle,
  scheduling,
  pending,
  onSelectDate,
  onSchedule,
  onAdjust,
  onUnschedule,
  onOpenTasks,
  onOpenCommitments,
  onCreateTask,
  onCreateCommitment,
  liveMessage,
}: DailyAgendaProps) {
  void onOpenCommitments
  const dateLabel = formatLocalDate(selectedDate, locale, dateStyle)
  const isToday = selectedDate === today

  return (
    <div className="space-y-section">
      <AgendaDateNav
        date={selectedDate}
        today={today}
        locale={locale}
        dateStyle={dateStyle}
        onChange={onSelectDate}
      />

      {!day.hasAnyActivity ? (
        <>
          <AgendaEmptyState
            dateLabel={dateLabel}
            onCreateCommitment={onCreateCommitment}
            onCreateTask={onCreateTask}
          />
          <AgendaUnscheduledList
            tasks={day.unscheduledTasks}
            locale={locale}
            dateStyle={dateStyle}
            onOpenTasks={onOpenTasks}
            onSchedule={onSchedule}
            scheduling={scheduling}
            pending={pending}
          />
        </>
      ) : (
        <>
          {day.conflicts && day.conflicts.length > 0 ? (
            <AgendaConflictSummary
              conflicts={day.conflicts}
              entries={day.entries}
              locale={locale}
              dateLabel={dateLabel}
            />
          ) : null}

          <AgendaTimeline
            entries={day.entries}
            locale={locale}
            dateLabel={dateLabel}
            empty={day.timelineEmpty}
            pending={pending}
            scheduling={scheduling}
            onSchedule={onSchedule}
            onAdjust={onAdjust}
            onUnschedule={onUnschedule}
          />

          <AgendaAvailability
            availability={day.availability}
            locale={locale}
            isToday={isToday}
            dateLabel={dateLabel}
          />

          <AgendaUnscheduledList
            tasks={day.unscheduledTasks}
            locale={locale}
            dateStyle={dateStyle}
            onOpenTasks={onOpenTasks}
            onSchedule={onSchedule}
            scheduling={scheduling}
            pending={pending}
          />
        </>
      )}

      <AgendaLiveRegion message={liveMessage} />
    </div>
  )
}

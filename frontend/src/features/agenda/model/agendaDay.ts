import type { Commitment } from '@/entities/commitment'
import type { Task } from '@/entities/task'
import { getLocalToday, minuteOfDayRoundedUp } from '@/shared/lib/localDateTime'
import { deriveAvailability } from './availability'
import { deriveConflicts } from './conflicts'
import { AGENDA_ENTRY_KEY_SEPARATOR } from './constants'
import { sortAgendaEntries } from './ordering'
import {
  buildTaskEntry,
  selectScheduledTasks,
  selectUnscheduledTasks,
} from './slot'
import { minutesFromTime } from './timeOfDay'
import type { AgendaDay, AgendaEntry, BuildAgendaDayInput } from './types'

function commitmentEntry(commitment: Commitment): AgendaEntry {
  const category =
    commitment.type === 'fixed' ? 'fixed-commitment' : 'flexible-commitment'
  const startMinutes = minutesFromTime(commitment.startTime)
  const rawEnd = minutesFromTime(commitment.endTime)
  const endMinutes = Math.max(startMinutes + 1, rawEnd)

  return {
    key: `${category}${AGENDA_ENTRY_KEY_SEPARATOR}${commitment.id}`,
    sourceId: commitment.id,
    category,
    title: commitment.title,
    startMinutes,
    endMinutes,
    conflicts: [],
    exceedsDayEnd: false,
  }
}

function taskEntries(tasks: readonly Task[], date: string): AgendaEntry[] {
  return selectScheduledTasks(tasks, date).map((task) => buildTaskEntry(task))
}

export function buildAgendaDay(input: BuildAgendaDayInput): AgendaDay {
  const { date, tasks, commitments, now, locale, sources } = input

  const entries = sortAgendaEntries(
    [
      ...commitments
        .filter((commitment) => commitment.date === date)
        .map(commitmentEntry),
      ...taskEntries(tasks, date),
    ],
    locale,
  )

  const unscheduledTasks = selectUnscheduledTasks(tasks)
  const timelineEmpty = entries.length === 0
  const hasAnyActivity = !timelineEmpty || unscheduledTasks.length > 0

  if (sources === 'incomplete') {
    return {
      date,
      entries,
      unscheduledTasks,
      conflicts: null,
      availability: { kind: 'none', reason: 'incomplete-sources' },
      timelineEmpty,
      hasAnyActivity,
    }
  }

  const { conflicts, entries: linkedEntries } = deriveConflicts(entries)
  const availability = deriveAvailability({
    entries: linkedEntries,
    date,
    today: getLocalToday(now),
    nowMinutes: minuteOfDayRoundedUp(now),
    sources,
  })

  return {
    date,
    entries: linkedEntries,
    unscheduledTasks,
    conflicts,
    availability,
    timelineEmpty,
    hasAnyActivity,
  }
}

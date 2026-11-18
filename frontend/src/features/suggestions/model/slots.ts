import type { AvailablePeriod } from '@/features/agenda'
import {
  isEligibleUnscheduledTask,
  slotDueRank,
  priorityRank,
} from './eligibility'
import { suggestionIdFor } from './identity'
import { choosePeriodByWeather } from './weather'
import type {
  PlanningSuggestion,
  SlotCandidateContext,
  SuggestionReason,
} from './types'

export function generateSlotCandidates(
  context: SlotCandidateContext,
): PlanningSuggestion[] {
  const { date, tasks, unscheduledTasks, periods, weather } = context
  if (periods.length === 0) return []

  const orderedPeriods = [...periods].sort((a, b) => {
    if (a.startMinutes !== b.startMinutes) {
      return a.startMinutes - b.startMinutes
    }
    return a.endMinutes - b.endMinutes
  })

  const suggestions: PlanningSuggestion[] = []

  for (const task of unscheduledTasks) {
    if (!isEligibleUnscheduledTask(task)) continue
    const durationMinutes = task.estimatedMinutes
    if (durationMinutes === undefined || durationMinutes < 1) continue

    const fittingPeriods = orderedPeriods.filter(
      (period) => period.endMinutes - period.startMinutes >= durationMinutes,
    )
    if (fittingPeriods.length === 0) continue

    const choice = choosePeriodByWeather({
      fittingPeriods,
      durationMinutes,
      weather,
    })
    const period = choice.period
    if (period.endMinutes <= period.startMinutes) continue

    const startMinutes = period.startMinutes
    const reasons: SuggestionReason[] = [
      {
        kind: 'fit',
        periodStartMinutes: period.startMinutes,
        periodEndMinutes: period.endMinutes,
        durationMinutes,
      },
    ]

    if (task.dueDate) {
      const urgency =
        task.dueDate < date
          ? 'overdue'
          : task.dueDate === date
            ? 'due-today'
            : 'future'
      reasons.push({ kind: 'due-date', urgency, dueDate: task.dueDate })
    }

    if (task.priority === 'high') {
      reasons.push({ kind: 'priority', priority: task.priority })
    }

    if (choice.evidence) {
      reasons.push({
        kind: 'weather',
        condition: choice.evidence.chosenCondition,
        precipitationProbability:
          choice.evidence.chosenPrecipitationProbability,
        spanStartMinutes: choice.evidence.chosenStartMinutes,
        spanEndMinutes: choice.evidence.chosenEndMinutes,
      })
    }

    const id = suggestionIdFor({
      category: 'slot',
      target: {
        kind: 'task',
        taskId: task.id,
        title: task.title,
      },
      change: {
        kind: 'schedule-task',
        taskId: task.id,
        plannedDate: date,
        startMinutes,
        endMinutes: startMinutes + durationMinutes,
        durationMinutes,
        current: null,
      },
    })

    const sourceOrder = Math.max(
      0,
      tasks.findIndex((candidate) => candidate.id === task.id),
    )

    suggestions.push({
      id,
      category: 'slot',
      target: { kind: 'task', taskId: task.id, title: task.title },
      change: {
        kind: 'schedule-task',
        taskId: task.id,
        plannedDate: date,
        startMinutes,
        endMinutes: startMinutes + durationMinutes,
        durationMinutes,
        current: null,
      },
      reasons,
      weather: choice.evidence,
      rank: {
        categoryRank: task.dueDate ? 1 : 2,
        dueRank: slotDueRank(task, date),
        dueDate: task.dueDate ?? null,
        priorityRank: priorityRank(task.priority),
        proposedStartMinutes: startMinutes,
        sourceOrder,
        suggestionId: id,
      },
    })
  }

  return suggestions
}

export type { AvailablePeriod }

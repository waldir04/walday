import type { Task } from '@/entities/task'
import type { AgendaDay, AgendaEntry } from '@/features/agenda'
import { AVAILABLE_GAP_MINUTES, DAY_END_MINUTES } from '@/shared/config/agenda'
import {
  entryActivityKey,
  isEligibleUnscheduledTask,
  priorityRank,
  slotDueRank,
} from './eligibility'
import { suggestionIdFor } from './identity'
import { invertIntervals, mergeIntervals } from './openPeriods'
import type {
  FlexibleAdjustmentContext,
  PlanningSuggestion,
  SuggestionReason,
} from './types'

interface Interval {
  startMinutes: number
  endMinutes: number
}

function compareBeneficiaries(a: Task, b: Task, date: string): number {
  const dueA = slotDueRank(a, date)
  const dueB = slotDueRank(b, date)
  if (dueA !== dueB) return dueA - dueB

  if (dueA === 2 && a.dueDate !== b.dueDate) {
    const left = a.dueDate ?? ''
    const right = b.dueDate ?? ''
    return left < right ? -1 : 1
  }

  const priorityA = priorityRank(a.priority)
  const priorityB = priorityRank(b.priority)
  if (priorityA !== priorityB) return priorityA - priorityB

  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
}

function overlapsAny(
  startMinutes: number,
  endMinutes: number,
  entries: readonly AgendaEntry[],
  excludedKey: string,
): boolean {
  return entries.some(
    (entry) =>
      entry.key !== excludedKey &&
      startMinutes < entry.endMinutes &&
      entry.startMinutes < endMinutes,
  )
}

function fittingPeriodAfterMove(input: {
  entries: readonly AgendaEntry[]
  commitmentKey: string
  newStartMinutes: number
  durationMinutes: number
  beneficiaryDurationMinutes: number
  nowMinutes: number
}): Interval | null {
  const {
    entries,
    commitmentKey,
    newStartMinutes,
    durationMinutes,
    beneficiaryDurationMinutes,
    nowMinutes,
  } = input

  const occupied: Interval[] = []
  for (const entry of entries) {
    if (entry.key === commitmentKey) continue
    const start = Math.max(entry.startMinutes, nowMinutes)
    const end = Math.min(entry.endMinutes, DAY_END_MINUTES)
    if (end > start) occupied.push({ startMinutes: start, endMinutes: end })
  }
  occupied.push({
    startMinutes: Math.max(newStartMinutes, nowMinutes),
    endMinutes: Math.min(newStartMinutes + durationMinutes, DAY_END_MINUTES),
  })

  const merged = mergeIntervals(occupied)
  const open = invertIntervals(merged, nowMinutes).filter(
    (period) =>
      period.endMinutes - period.startMinutes >= AVAILABLE_GAP_MINUTES,
  )

  return (
    open.find(
      (period) =>
        period.endMinutes - period.startMinutes >= beneficiaryDurationMinutes,
    ) ?? null
  )
}

/**
 * Flexible commitments may move only to unblock a named beneficiary task.
 * The beneficiary is never scheduled in the same change.
 */
export function generateFlexibleAdjustmentCandidates(
  context: FlexibleAdjustmentContext,
): PlanningSuggestion[] {
  const {
    date,
    unscheduledTasks,
    entries,
    commitments,
    periods,
    nowMinutes,
    occupiedActivityKeys,
  } = context

  if (periods.length === 0) return []

  const beneficiaries = unscheduledTasks
    .filter(isEligibleUnscheduledTask)
    .filter((task) => {
      const duration = task.estimatedMinutes ?? 0
      return !periods.some(
        (period) => period.endMinutes - period.startMinutes >= duration,
      )
    })
    .sort((a, b) => compareBeneficiaries(a, b, date))

  if (beneficiaries.length === 0) return []

  const flexible = commitments
    .filter(
      (commitment) =>
        commitment.type === 'flexible' && commitment.date === date,
    )
    .sort((a, b) => {
      if (a.startTime !== b.startTime) return a.startTime < b.startTime ? -1 : 1
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
    })

  const suggestions: PlanningSuggestion[] = []

  for (const beneficiary of beneficiaries) {
    const beneficiaryKey = `task:${beneficiary.id}`
    if (occupiedActivityKeys.has(beneficiaryKey)) continue
    const beneficiaryDuration = beneficiary.estimatedMinutes ?? 0
    if (beneficiaryDuration < 1) continue

    for (const commitment of flexible) {
      const entry = entries.find(
        (candidate) =>
          candidate.category !== 'task' && candidate.sourceId === commitment.id,
      )
      if (!entry) continue

      const commitmentKey = entry.key
      const activityKey = entryActivityKey(entry)
      if (occupiedActivityKeys.has(activityKey)) continue

      const durationMinutes = entry.endMinutes - entry.startMinutes
      if (durationMinutes < 1) continue

      const moved = findFirstMove({
        entries,
        commitmentKey,
        currentStartMinutes: entry.startMinutes,
        durationMinutes,
        beneficiaryDurationMinutes: beneficiaryDuration,
        nowMinutes,
      })

      if (!moved) continue

      const change = {
        kind: 'move-commitment' as const,
        commitmentId: commitment.id,
        date,
        fromStartMinutes: entry.startMinutes,
        fromEndMinutes: entry.endMinutes,
        startMinutes: moved.startMinutes,
        endMinutes: moved.startMinutes + durationMinutes,
        durationMinutes,
        current: {
          startMinutes: entry.startMinutes,
          endMinutes: entry.endMinutes,
        },
      }

      const id = suggestionIdFor({
        category: 'flexible-adjustment',
        target: {
          kind: 'commitment',
          commitmentId: commitment.id,
          title: commitment.title,
        },
        change,
        beneficiaryTaskId: beneficiary.id,
      })

      const reasons: SuggestionReason[] = [
        {
          kind: 'beneficiary',
          taskId: beneficiary.id,
          taskTitle: beneficiary.title,
        },
        {
          kind: 'fit',
          periodStartMinutes: moved.period.startMinutes,
          periodEndMinutes: moved.period.endMinutes,
          durationMinutes: beneficiaryDuration,
        },
      ]

      const sourceOrder = Math.max(
        0,
        commitments.findIndex((candidate) => candidate.id === commitment.id),
      )

      suggestions.push({
        id,
        category: 'flexible-adjustment',
        target: {
          kind: 'commitment',
          commitmentId: commitment.id,
          title: commitment.title,
        },
        change,
        reasons,
        weather: null,
        rank: {
          categoryRank: 3,
          dueRank: slotDueRank(beneficiary, date),
          dueDate: beneficiary.dueDate ?? null,
          priorityRank: priorityRank(beneficiary.priority),
          proposedStartMinutes: moved.startMinutes,
          sourceOrder,
          suggestionId: id,
        },
      })

      break
    }
  }

  return suggestions
}

function findFirstMove(input: {
  entries: readonly AgendaEntry[]
  commitmentKey: string
  currentStartMinutes: number
  durationMinutes: number
  beneficiaryDurationMinutes: number
  nowMinutes: number
}): { startMinutes: number; period: Interval } | null {
  const {
    entries,
    commitmentKey,
    currentStartMinutes,
    durationMinutes,
    beneficiaryDurationMinutes,
    nowMinutes,
  } = input

  const latestStart = DAY_END_MINUTES - durationMinutes
  for (let start = nowMinutes; start <= latestStart; start += 1) {
    if (start === currentStartMinutes) continue
    const end = start + durationMinutes
    if (overlapsAny(start, end, entries, commitmentKey)) continue

    const period = fittingPeriodAfterMove({
      entries,
      commitmentKey,
      newStartMinutes: start,
      durationMinutes,
      beneficiaryDurationMinutes,
      nowMinutes,
    })
    if (period) return { startMinutes: start, period }
  }

  return null
}

export type { AgendaDay }

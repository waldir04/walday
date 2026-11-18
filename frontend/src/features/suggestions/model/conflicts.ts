import type { AgendaDay, AgendaEntry } from '@/features/agenda'
import { DAY_END_MINUTES } from '@/shared/config/agenda'
import {
  collectConflictCommitmentCandidates,
  collectConflictTaskCandidates,
  compareConflictTaskCandidates,
  entryActivityKey,
  isFixedCommitmentEntry,
  slotDueRank,
  priorityRank,
} from './eligibility'
import { suggestionIdFor } from './identity'
import { openPeriodsExcluding } from './openPeriods'
import type {
  ConflictCandidateContext,
  PlanningSuggestion,
  ProposedChange,
  SuggestionReason,
} from './types'

export function findAlternativeStart(input: {
  entries: AgendaDay['entries']
  excludedKey: string
  durationMinutes: number
  nowMinutes: number
  currentStartMinutes: number
}): number | null {
  const {
    entries,
    excludedKey,
    durationMinutes,
    nowMinutes,
    currentStartMinutes,
  } = input

  if (durationMinutes < 1) return null
  if (nowMinutes + durationMinutes > DAY_END_MINUTES) return null

  const periods = openPeriodsExcluding(entries, excludedKey, nowMinutes)

  for (const period of periods) {
    let candidate = period.startMinutes
    if (candidate === currentStartMinutes) candidate += 1
    if (candidate + durationMinutes <= period.endMinutes) return candidate
  }

  return null
}

function groupMembers(
  group: ConflictCandidateContext['group'],
  entries: AgendaDay['entries'],
): AgendaEntry[] {
  const keys = new Set(group.entryKeys)
  return entries.filter((entry) => keys.has(entry.key))
}

function remainingOverlaps(
  members: readonly AgendaEntry[],
  movedKey: string,
): {
  titles: [string, string]
  overlapStartMinutes: number
  overlapEndMinutes: number
}[] {
  const others = members.filter((entry) => entry.key !== movedKey)
  const overlaps: {
    titles: [string, string]
    overlapStartMinutes: number
    overlapEndMinutes: number
  }[] = []

  for (let index = 0; index < others.length; index += 1) {
    const a = others[index]
    if (!a) continue
    for (
      let otherIndex = index + 1;
      otherIndex < others.length;
      otherIndex += 1
    ) {
      const b = others[otherIndex]
      if (!b) continue
      if (a.startMinutes < b.endMinutes && b.startMinutes < a.endMinutes) {
        overlaps.push({
          titles: [a.title, b.title],
          overlapStartMinutes: Math.max(a.startMinutes, b.startMinutes),
          overlapEndMinutes: Math.min(a.endMinutes, b.endMinutes),
        })
      }
    }
  }

  return overlaps
}

function rankForConflict(input: {
  entry: AgendaEntry
  taskId: string | null
  date: string
  groupStartMinutes: number
  tasks: ConflictCandidateContext['tasks']
  commitments: ConflictCandidateContext['commitments']
  suggestionId: string
}): PlanningSuggestion['rank'] {
  const { entry, taskId, date, groupStartMinutes } = input
  const task = taskId
    ? input.tasks.find((candidate) => candidate.id === taskId)
    : undefined
  const sourceOrder = task
    ? Math.max(
        0,
        input.tasks.findIndex((candidate) => candidate.id === task.id),
      )
    : Math.max(
        0,
        input.commitments.findIndex(
          (candidate) => candidate.id === entry.sourceId,
        ),
      )

  return {
    categoryRank: 0,
    dueRank: task ? slotDueRank(task, date) : 4,
    dueDate: task?.dueDate ?? null,
    priorityRank: task ? priorityRank(task.priority) : 1,
    proposedStartMinutes: groupStartMinutes,
    sourceOrder,
    suggestionId: input.suggestionId,
  }
}

/**
 * One candidate per conflict group at most. Flexible commitments are preferred;
 * otherwise the least deadline-urgent movable task is chosen. Fixed
 * commitments are excluded before any selection.
 */
export function generateConflictCandidates(
  context: ConflictCandidateContext,
): PlanningSuggestion[] {
  const { date, group, entries, tasks, commitments, nowMinutes } = context
  const members = groupMembers(group, entries)
  if (members.length < 2) return []

  const memberKeys = new Set(members.map((entry) => entry.key))
  const fixedProtected = members.some(isFixedCommitmentEntry)

  const flexible = collectConflictCommitmentCandidates({
    entryKeys: [...memberKeys],
    entries,
    commitments,
    date,
  })

  for (const candidate of flexible) {
    const durationMinutes =
      candidate.entry.endMinutes - candidate.entry.startMinutes
    const alternative = findAlternativeStart({
      entries,
      excludedKey: candidate.entry.key,
      durationMinutes,
      nowMinutes,
      currentStartMinutes: candidate.entry.startMinutes,
    })
    if (alternative === null) continue

    const change: ProposedChange = {
      kind: 'move-commitment',
      commitmentId: candidate.commitment.id,
      date,
      fromStartMinutes: candidate.entry.startMinutes,
      fromEndMinutes: candidate.entry.endMinutes,
      startMinutes: alternative,
      endMinutes: alternative + durationMinutes,
      durationMinutes,
      current: {
        startMinutes: candidate.entry.startMinutes,
        endMinutes: candidate.entry.endMinutes,
      },
    }

    const id = suggestionIdFor({
      category: 'conflict',
      target: {
        kind: 'commitment',
        commitmentId: candidate.commitment.id,
        title: candidate.commitment.title,
      },
      change,
    })

    const reason: SuggestionReason = {
      kind: 'conflict',
      conflictingTitles: members.map((entry) => entry.title),
      overlapStartMinutes: group.startMinutes,
      overlapEndMinutes: group.endMinutes,
      fixedProtected,
      remainingOverlaps: remainingOverlaps(members, candidate.entry.key),
    }

    return [
      {
        id,
        category: 'conflict',
        target: {
          kind: 'commitment',
          commitmentId: candidate.commitment.id,
          title: candidate.commitment.title,
        },
        change,
        reasons: [reason],
        weather: null,
        rank: rankForConflict({
          entry: candidate.entry,
          taskId: null,
          date,
          groupStartMinutes: group.startMinutes,
          tasks,
          commitments,
          suggestionId: id,
        }),
      },
    ]
  }

  const movableTasks = collectConflictTaskCandidates({
    entryKeys: [...memberKeys],
    entries,
    tasks,
  }).sort((a, b) => compareConflictTaskCandidates(a, b, date))

  for (const candidate of movableTasks) {
    const durationMinutes =
      candidate.task.estimatedMinutes ??
      candidate.entry.endMinutes - candidate.entry.startMinutes
    const alternative = findAlternativeStart({
      entries,
      excludedKey: candidate.entry.key,
      durationMinutes,
      nowMinutes,
      currentStartMinutes: candidate.entry.startMinutes,
    })
    if (alternative === null) continue

    const change: ProposedChange = {
      kind: 'move-task',
      taskId: candidate.task.id,
      plannedDate: date,
      fromStartMinutes: candidate.entry.startMinutes,
      fromEndMinutes: candidate.entry.endMinutes,
      startMinutes: alternative,
      endMinutes: alternative + durationMinutes,
      durationMinutes,
      current: {
        startMinutes: candidate.entry.startMinutes,
        endMinutes: candidate.entry.endMinutes,
      },
    }

    const id = suggestionIdFor({
      category: 'conflict',
      target: {
        kind: 'task',
        taskId: candidate.task.id,
        title: candidate.task.title,
      },
      change,
    })

    const reason: SuggestionReason = {
      kind: 'conflict',
      conflictingTitles: members.map((entry) => entry.title),
      overlapStartMinutes: group.startMinutes,
      overlapEndMinutes: group.endMinutes,
      fixedProtected,
      remainingOverlaps: remainingOverlaps(members, candidate.entry.key),
    }

    return [
      {
        id,
        category: 'conflict',
        target: {
          kind: 'task',
          taskId: candidate.task.id,
          title: candidate.task.title,
        },
        change,
        reasons: [reason],
        weather: null,
        rank: rankForConflict({
          entry: candidate.entry,
          taskId: candidate.task.id,
          date,
          groupStartMinutes: group.startMinutes,
          tasks,
          commitments,
          suggestionId: id,
        }),
      },
    ]
  }

  return []
}

export { entryActivityKey }

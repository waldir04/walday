import type { Commitment } from '@/entities/commitment'
import type { Priority, Task } from '@/entities/task'
import type { AgendaDay, AgendaEntry } from '@/features/agenda'
import type { LocalDate } from '@/shared/lib/localDateTime'

export interface ConflictTaskCandidate {
  task: Task
  entry: AgendaEntry & { category: 'task' }
  sourceOrder: number
}

export function entryActivityKey(entry: AgendaEntry): string {
  return entry.category === 'task'
    ? `task:${entry.sourceId}`
    : `commitment:${entry.sourceId}`
}

export function isFixedCommitmentEntry(entry: AgendaEntry): boolean {
  return entry.category === 'fixed-commitment'
}

export function isFlexibleCommitmentEntry(entry: AgendaEntry): boolean {
  return entry.category === 'flexible-commitment'
}

export function isMovableScheduledTask(task: Task): boolean {
  return (
    task.status === 'pending' &&
    task.plannedDate !== undefined &&
    task.estimatedMinutes !== undefined &&
    task.estimatedMinutes >= 1
  )
}

export function isEligibleUnscheduledTask(task: Task): boolean {
  return (
    task.status === 'pending' &&
    task.plannedDate === undefined &&
    task.estimatedMinutes !== undefined &&
    task.estimatedMinutes >= 1
  )
}

/** Due class used for slot urgency: overdue, today, future, none. */
export function slotDueRank(task: Task, date: LocalDate): 0 | 1 | 2 | 3 {
  if (!task.dueDate) return 3
  if (task.dueDate < date) return 0
  if (task.dueDate === date) return 1
  return 2
}

/** Due class used when choosing the least deadline-urgent task. */
export function conflictDueRank(task: Task, date: LocalDate): 0 | 1 | 2 | 3 {
  if (!task.dueDate) return 0
  if (task.dueDate > date) return 1
  if (task.dueDate === date) return 2
  return 3
}

export function priorityRank(priority: Priority): 0 | 1 | 2 {
  if (priority === 'high') return 0
  if (priority === 'medium') return 1
  return 2
}

/** Lowest importance first, so a conflict displaces the least urgent task. */
export function conflictPriorityRank(priority: Priority): 0 | 1 | 2 {
  if (priority === 'low') return 0
  if (priority === 'medium') return 1
  return 2
}

export function collectConflictTaskCandidates(input: {
  entryKeys: readonly string[]
  entries: AgendaDay['entries']
  tasks: readonly Task[]
}): ConflictTaskCandidate[] {
  const { entryKeys, entries, tasks } = input
  const keys = new Set(entryKeys)
  const sourceOrder = new Map(tasks.map((task, index) => [task.id, index]))
  const candidates: ConflictTaskCandidate[] = []

  for (const entry of entries) {
    if (!keys.has(entry.key) || entry.category !== 'task') continue
    const task = tasks.find((candidate) => candidate.id === entry.sourceId)
    if (!task || !isMovableScheduledTask(task)) continue
    candidates.push({
      task,
      entry,
      sourceOrder: sourceOrder.get(task.id) ?? Number.MAX_SAFE_INTEGER,
    })
  }

  return candidates
}

export function compareConflictTaskCandidates(
  a: ConflictTaskCandidate,
  b: ConflictTaskCandidate,
  date: LocalDate,
): number {
  const dueA = conflictDueRank(a.task, date)
  const dueB = conflictDueRank(b.task, date)
  if (dueA !== dueB) return dueA - dueB

  if (dueA === 1 && a.task.dueDate !== b.task.dueDate) {
    const left = a.task.dueDate ?? ''
    const right = b.task.dueDate ?? ''
    return left < right ? 1 : -1
  }

  const priorityA = conflictPriorityRank(a.task.priority)
  const priorityB = conflictPriorityRank(b.task.priority)
  if (priorityA !== priorityB) return priorityA - priorityB

  if (a.entry.startMinutes !== b.entry.startMinutes) {
    return b.entry.startMinutes - a.entry.startMinutes
  }

  if (a.sourceOrder !== b.sourceOrder) return a.sourceOrder - b.sourceOrder

  return a.task.id < b.task.id ? -1 : a.task.id > b.task.id ? 1 : 0
}

export function collectConflictCommitmentCandidates(input: {
  entryKeys: readonly string[]
  entries: AgendaDay['entries']
  commitments: readonly Commitment[]
  date: LocalDate
}): { commitment: Commitment; entry: AgendaEntry }[] {
  const { entryKeys, entries, commitments, date } = input
  const keys = new Set(entryKeys)
  const candidates: { commitment: Commitment; entry: AgendaEntry }[] = []

  for (const entry of entries) {
    if (!keys.has(entry.key) || entry.category !== 'flexible-commitment')
      continue
    const commitment = commitments.find(
      (candidate) => candidate.id === entry.sourceId,
    )
    if (!commitment || commitment.type !== 'flexible') continue
    if (commitment.date !== date) continue
    candidates.push({ commitment, entry })
  }

  candidates.sort((a, b) => {
    if (a.entry.startMinutes !== b.entry.startMinutes) {
      return a.entry.startMinutes - b.entry.startMinutes
    }
    return a.entry.key < b.entry.key ? -1 : a.entry.key > b.entry.key ? 1 : 0
  })

  return candidates
}

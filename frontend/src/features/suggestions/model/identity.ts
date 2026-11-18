import type {
  ProposedChange,
  SuggestionCategory,
  SuggestionTarget,
} from './types'

export function activityKeyFor(target: SuggestionTarget): string {
  return target.kind === 'task'
    ? `task:${target.taskId}`
    : `commitment:${target.commitmentId}`
}

export function changeSignatureFor(change: ProposedChange): string {
  switch (change.kind) {
    case 'schedule-task':
      return `schedule-task:${change.taskId}:${change.plannedDate}:${change.startMinutes}-${change.endMinutes}`
    case 'move-task':
      return `move-task:${change.taskId}:${change.plannedDate}:${change.fromStartMinutes}-${change.fromEndMinutes}:${change.startMinutes}-${change.endMinutes}`
    case 'move-commitment':
      return `move-commitment:${change.commitmentId}:${change.date}:${change.fromStartMinutes}-${change.fromEndMinutes}:${change.startMinutes}-${change.endMinutes}`
  }
}

export function suggestionIdFor(input: {
  category: SuggestionCategory
  target: SuggestionTarget
  change: ProposedChange
  beneficiaryTaskId?: string
}): string {
  const { category, target, change } = input

  switch (change.kind) {
    case 'schedule-task':
      return `slot:task:${change.taskId}:${change.plannedDate}:${change.startMinutes}`
    case 'move-task':
      return `conflict:task:${change.taskId}:${change.fromStartMinutes}-${change.startMinutes}`
    case 'move-commitment': {
      if (category === 'flexible-adjustment') {
        const beneficiary = input.beneficiaryTaskId ?? ''
        return `flex:commitment:${change.commitmentId}:${change.date}:${change.fromStartMinutes}-${change.startMinutes}-${change.endMinutes}:task:${beneficiary}`
      }
      return `conflict:commitment:${change.commitmentId}:${change.fromStartMinutes}-${change.startMinutes}-${change.endMinutes}`
    }
  }

  // Unreachable for every ProposedChange variant; keeps the function total.
  return `conflict:${activityKeyFor(target)}`
}

import {
  DEFAULT_PRIORITY,
  isLocalDate,
  parseDurationInput,
  validateTaskDraft,
  type Task,
  type TaskDraft,
  type TaskFieldError,
  type TaskFieldName,
  type TaskValidationCode,
} from '@/entities/task'

export interface TaskFields {
  title: string
  description?: string
  priority: Task['priority']
  dueDate?: Task['dueDate']
  estimatedMinutes?: number
}

export const EMPTY_TASK_DRAFT: TaskDraft = {
  title: '',
  description: '',
  priority: DEFAULT_PRIORITY,
  dueDate: '',
  estimatedDurationInput: '',
}

export function emptyTaskDraft(): TaskDraft {
  return { ...EMPTY_TASK_DRAFT }
}

export function draftFromTask(task: Task): TaskDraft {
  return {
    title: task.title,
    description: task.description ?? '',
    priority: task.priority,
    dueDate: task.dueDate ?? '',
    estimatedDurationInput:
      task.estimatedMinutes !== undefined ? `${task.estimatedMinutes} min` : '',
  }
}

export function fieldsFromDraft(
  draft: TaskDraft,
):
  | { ok: true; value: TaskFields; errors: [] }
  | { ok: false; value?: undefined; errors: TaskFieldError[] } {
  const errors = validateTaskDraft(draft)
  if (errors.length > 0) {
    return { ok: false, errors }
  }

  const description = draft.description.trim()
  const dueDate = draft.dueDate.trim()
  const durationInput = draft.estimatedDurationInput.trim()
  const parsedDuration =
    durationInput.length > 0 ? parseDurationInput(durationInput) : null

  return {
    ok: true,
    errors: [],
    value: {
      title: draft.title.trim(),
      ...(description ? { description } : {}),
      priority: draft.priority,
      ...(dueDate && isLocalDate(dueDate) ? { dueDate } : {}),
      ...(parsedDuration?.ok
        ? { estimatedMinutes: parsedDuration.minutes }
        : {}),
    },
  }
}

export function errorsByField(
  errors: TaskFieldError[],
): Partial<Record<TaskFieldName, TaskValidationCode>> {
  const result: Partial<Record<TaskFieldName, TaskValidationCode>> = {}
  for (const error of errors) {
    result[error.field] ??= error.code
  }
  return result
}

const VALIDATION_MESSAGE_KEYS: Record<TaskValidationCode, string> = {
  TITLE_REQUIRED: 'validation.titleRequired',
  TITLE_TOO_SHORT: 'validation.titleTooShort',
  TITLE_TOO_LONG: 'validation.titleTooLong',
  DESCRIPTION_TOO_LONG: 'validation.descriptionTooLong',
  PRIORITY_INVALID: 'validation.priorityInvalid',
  DUE_DATE_INVALID: 'validation.dueDateInvalid',
  DURATION_INVALID: 'validation.durationInvalid',
  DURATION_OUT_OF_RANGE: 'validation.durationRange',
  DURATION_FRACTIONAL: 'validation.durationFractional',
}

export function validationMessageKey(code: TaskValidationCode): string {
  return VALIDATION_MESSAGE_KEYS[code]
}

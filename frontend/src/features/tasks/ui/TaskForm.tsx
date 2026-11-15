import { useEffect, useRef, useState } from 'react'
import type { FormEvent, RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import {
  TASK_PRIORITIES,
  isPriority,
  validateTaskDraft,
  type TaskDraft,
} from '@/entities/task'
import { Button } from '@/shared/ui/Button'
import {
  emptyTaskDraft,
  errorsByField,
  validationMessageKey,
} from '../model/taskDraft'

export interface TaskFormProps {
  onSubmit: (_draft: TaskDraft) => Promise<boolean>
  pending: boolean
  titleInputRef?: RefObject<HTMLInputElement | null>
  onDraftActiveChange?: (_active: boolean) => void
}

const FIELD_CLASSES =
  'mt-1 min-h-11 w-full rounded-control border border-border-strong bg-surface px-3 py-2 text-body text-text'

export function TaskForm({
  onSubmit,
  pending,
  titleInputRef,
  onDraftActiveChange,
}: TaskFormProps) {
  const { t } = useTranslation('tasks')
  const [draft, setDraft] = useState<TaskDraft>(emptyTaskDraft)
  const [errors, setErrors] = useState(
    [] as ReturnType<typeof validateTaskDraft>,
  )
  const localTitleRef = useRef<HTMLInputElement>(null)
  const activeChangeRef = useRef(onDraftActiveChange)

  useEffect(() => {
    activeChangeRef.current = onDraftActiveChange
  }, [onDraftActiveChange])
  const titleRef = titleInputRef ?? localTitleRef

  useEffect(() => {
    return () => {
      activeChangeRef.current?.(false)
    }
  }, [])

  const fieldErrors = errorsByField(errors)
  const showSummary = errors.length > 1

  function change<K extends keyof TaskDraft>(field: K, value: TaskDraft[K]) {
    setDraft((current) => ({ ...current, [field]: value }))
    activeChangeRef.current?.(true)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return

    const validation = validateTaskDraft(draft)
    if (validation.length > 0) {
      setErrors(validation)
      return
    }

    setErrors([])
    const saved = await onSubmit(draft)
    if (!saved) return

    setDraft(emptyTaskDraft())
    setErrors([])
    activeChangeRef.current?.(false)
    titleRef.current?.focus()
  }

  return (
    <form
      onSubmit={handleSubmit}
      aria-label={t('form.heading')}
      aria-busy={pending || undefined}
      className="space-y-stack rounded-2xl border border-border bg-surface p-5"
      noValidate
    >
      {showSummary ? (
        <div
          role="alert"
          className="rounded-2xl border border-danger bg-surface-raised p-3"
        >
          <p className="font-medium text-danger">{t('validation.summary')}</p>
          <ul className="mt-1 list-disc pl-5 text-caption text-text">
            {errors.map((error, index) => (
              <li key={`${error.field}-${error.code}-${index}`}>
                {t(validationMessageKey(error.code))}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div>
        <label htmlFor="task-title" className="block text-caption font-medium">
          {t('form.title')}
        </label>
        <input
          id="task-title"
          ref={titleRef}
          type="text"
          value={draft.title}
          onChange={(event) => change('title', event.target.value)}
          className={FIELD_CLASSES}
          aria-invalid={fieldErrors.title ? true : undefined}
          aria-describedby={fieldErrors.title ? 'task-title-error' : undefined}
        />
        {fieldErrors.title ? (
          <p
            id="task-title-error"
            role={showSummary ? undefined : 'alert'}
            className="mt-1 text-caption text-danger"
          >
            {t(validationMessageKey(fieldErrors.title))}
          </p>
        ) : null}
      </div>

      <div>
        <label
          htmlFor="task-description"
          className="block text-caption font-medium"
        >
          {t('form.description')}
        </label>
        <textarea
          id="task-description"
          value={draft.description}
          onChange={(event) => change('description', event.target.value)}
          rows={3}
          className={FIELD_CLASSES}
          aria-invalid={fieldErrors.description ? true : undefined}
          aria-describedby={
            fieldErrors.description ? 'task-description-error' : undefined
          }
        />
        {fieldErrors.description ? (
          <p
            id="task-description-error"
            role={showSummary ? undefined : 'alert'}
            className="mt-1 text-caption text-danger"
          >
            {t(validationMessageKey(fieldErrors.description))}
          </p>
        ) : null}
      </div>

      <div className="grid gap-stack sm:grid-cols-3">
        <div>
          <label
            htmlFor="task-priority"
            className="block text-caption font-medium"
          >
            {t('form.priority')}
          </label>
          <select
            id="task-priority"
            value={draft.priority}
            onChange={(event) => {
              if (isPriority(event.target.value)) {
                change('priority', event.target.value)
              }
            }}
            className={FIELD_CLASSES}
            aria-invalid={fieldErrors.priority ? true : undefined}
            aria-describedby={
              fieldErrors.priority ? 'task-priority-error' : undefined
            }
          >
            {TASK_PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {t(`form.priorityOptions.${priority}`)}
              </option>
            ))}
          </select>
          {fieldErrors.priority ? (
            <p
              id="task-priority-error"
              role={showSummary ? undefined : 'alert'}
              className="mt-1 text-caption text-danger"
            >
              {t(validationMessageKey(fieldErrors.priority))}
            </p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor="task-dueDate"
            className="block text-caption font-medium"
          >
            {t('form.dueDate')}
          </label>
          <input
            id="task-dueDate"
            type="date"
            value={draft.dueDate}
            onChange={(event) => change('dueDate', event.target.value)}
            className={FIELD_CLASSES}
            aria-invalid={fieldErrors.dueDate ? true : undefined}
            aria-describedby={
              fieldErrors.dueDate ? 'task-dueDate-error' : undefined
            }
          />
          {fieldErrors.dueDate ? (
            <p
              id="task-dueDate-error"
              role={showSummary ? undefined : 'alert'}
              className="mt-1 text-caption text-danger"
            >
              {t(validationMessageKey(fieldErrors.dueDate))}
            </p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor="task-duration"
            className="block text-caption font-medium"
          >
            {t('form.duration')}
          </label>
          <input
            id="task-duration"
            type="text"
            inputMode="text"
            value={draft.estimatedDurationInput}
            onChange={(event) =>
              change('estimatedDurationInput', event.target.value)
            }
            placeholder={t('form.durationPlaceholder')}
            className={FIELD_CLASSES}
            aria-invalid={fieldErrors.estimatedMinutes ? true : undefined}
            aria-describedby={
              fieldErrors.estimatedMinutes ? 'task-duration-error' : undefined
            }
          />
          {fieldErrors.estimatedMinutes ? (
            <p
              id="task-duration-error"
              role={showSummary ? undefined : 'alert'}
              className="mt-1 text-caption text-danger"
            >
              {t(validationMessageKey(fieldErrors.estimatedMinutes))}
            </p>
          ) : null}
        </div>
      </div>

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? t('form.submitting') : t('form.submit')}
        </Button>
      </div>
    </form>
  )
}

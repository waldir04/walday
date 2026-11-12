import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import {
  TASK_PRIORITIES,
  isPriority,
  validateTaskDraft,
  type Task,
  type TaskDraft,
} from '@/entities/task'
import { Button } from '@/shared/ui/Button'
import {
  draftFromTask,
  errorsByField,
  validationMessageKey,
} from '../model/taskDraft'

export interface TaskEditFormProps {
  task: Task
  onSave: (_draft: TaskDraft) => Promise<boolean>
  onCancel: () => void
  pending: boolean
  onDraftActiveChange?: (_active: boolean) => void
}

const FIELD_CLASSES =
  'mt-1 min-h-11 w-full rounded-control border border-border bg-surface px-3 py-2 text-body text-text'

export function TaskEditForm({
  task,
  onSave,
  onCancel,
  pending,
  onDraftActiveChange,
}: TaskEditFormProps) {
  const { t } = useTranslation('tasks')
  const [draft, setDraft] = useState<TaskDraft>(() => draftFromTask(task))
  const [errors, setErrors] = useState(
    [] as ReturnType<typeof validateTaskDraft>,
  )
  const activeChangeRef = useRef(onDraftActiveChange)

  useEffect(() => {
    activeChangeRef.current = onDraftActiveChange
  }, [onDraftActiveChange])
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    activeChangeRef.current?.(true)
    titleRef.current?.focus()
    return () => {
      activeChangeRef.current?.(false)
    }
  }, [])

  const fieldErrors = errorsByField(errors)
  const showSummary = errors.length > 1
  const idPrefix = `edit-${task.id}`

  function change<K extends keyof TaskDraft>(field: K, value: TaskDraft[K]) {
    setDraft((current) => ({ ...current, [field]: value }))
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
    await onSave(draft)
  }

  return (
    <form
      onSubmit={handleSubmit}
      aria-label={t('edit.heading')}
      aria-busy={pending || undefined}
      className="space-y-stack"
      noValidate
    >
      {showSummary ? (
        <div
          role="alert"
          className="rounded-card border border-danger bg-surface-subtle p-3"
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
        <label
          htmlFor={`${idPrefix}-title`}
          className="block text-caption font-medium"
        >
          {t('form.title')}
        </label>
        <input
          id={`${idPrefix}-title`}
          ref={titleRef}
          type="text"
          value={draft.title}
          onChange={(event) => change('title', event.target.value)}
          className={FIELD_CLASSES}
          aria-invalid={fieldErrors.title ? true : undefined}
          aria-describedby={
            fieldErrors.title ? `${idPrefix}-title-error` : undefined
          }
        />
        {fieldErrors.title ? (
          <p
            id={`${idPrefix}-title-error`}
            role={showSummary ? undefined : 'alert'}
            className="mt-1 text-caption text-danger"
          >
            {t(validationMessageKey(fieldErrors.title))}
          </p>
        ) : null}
      </div>

      <div>
        <label
          htmlFor={`${idPrefix}-description`}
          className="block text-caption font-medium"
        >
          {t('form.description')}
        </label>
        <textarea
          id={`${idPrefix}-description`}
          value={draft.description}
          onChange={(event) => change('description', event.target.value)}
          rows={3}
          className={FIELD_CLASSES}
          aria-invalid={fieldErrors.description ? true : undefined}
          aria-describedby={
            fieldErrors.description
              ? `${idPrefix}-description-error`
              : undefined
          }
        />
        {fieldErrors.description ? (
          <p
            id={`${idPrefix}-description-error`}
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
            htmlFor={`${idPrefix}-priority`}
            className="block text-caption font-medium"
          >
            {t('form.priority')}
          </label>
          <select
            id={`${idPrefix}-priority`}
            value={draft.priority}
            onChange={(event) => {
              if (isPriority(event.target.value)) {
                change('priority', event.target.value)
              }
            }}
            className={FIELD_CLASSES}
            aria-invalid={fieldErrors.priority ? true : undefined}
            aria-describedby={
              fieldErrors.priority ? `${idPrefix}-priority-error` : undefined
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
              id={`${idPrefix}-priority-error`}
              role={showSummary ? undefined : 'alert'}
              className="mt-1 text-caption text-danger"
            >
              {t(validationMessageKey(fieldErrors.priority))}
            </p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor={`${idPrefix}-dueDate`}
            className="block text-caption font-medium"
          >
            {t('form.dueDate')}
          </label>
          <input
            id={`${idPrefix}-dueDate`}
            type="date"
            value={draft.dueDate}
            onChange={(event) => change('dueDate', event.target.value)}
            className={FIELD_CLASSES}
            aria-invalid={fieldErrors.dueDate ? true : undefined}
            aria-describedby={
              fieldErrors.dueDate ? `${idPrefix}-dueDate-error` : undefined
            }
          />
          {fieldErrors.dueDate ? (
            <p
              id={`${idPrefix}-dueDate-error`}
              role={showSummary ? undefined : 'alert'}
              className="mt-1 text-caption text-danger"
            >
              {t(validationMessageKey(fieldErrors.dueDate))}
            </p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor={`${idPrefix}-duration`}
            className="block text-caption font-medium"
          >
            {t('form.duration')}
          </label>
          <input
            id={`${idPrefix}-duration`}
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
              fieldErrors.estimatedMinutes
                ? `${idPrefix}-duration-error`
                : undefined
            }
          />
          {fieldErrors.estimatedMinutes ? (
            <p
              id={`${idPrefix}-duration-error`}
              role={showSummary ? undefined : 'alert'}
              className="mt-1 text-caption text-danger"
            >
              {t(validationMessageKey(fieldErrors.estimatedMinutes))}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? t('edit.saving') : t('edit.save')}
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          {t('edit.cancel')}
        </Button>
      </div>
    </form>
  )
}

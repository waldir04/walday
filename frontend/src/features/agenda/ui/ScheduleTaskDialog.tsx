import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { parseDurationInput, type Task } from '@/entities/task'
import { useDialogFocusTrap } from '@/shared/lib/useDialogFocusTrap'
import { formatLocalDate, type LocalDate } from '@/shared/lib/localDateTime'
import { Button } from '@/shared/ui/Button'
import { DAY_END_MINUTES } from '@/shared/config/agenda'
import { minutesToTimeLabel } from '../model/timeOfDay'
import type { ScheduleDraft, ScheduleErrorCode } from '../model/scheduleDraft'
import type { ConflictLink } from '../model/types'

export interface ScheduleTaskDialogProps {
  open: boolean
  mode: 'create' | 'move'
  task: Task
  date: LocalDate
  locale: string
  dateStyle: Intl.DateTimeFormatOptions['dateStyle']
  initialStartTime: string | null
  initialDurationInput: string
  conflictsFor: (_startTime: string) => ConflictLink[]
  pending: boolean
  onConfirm: (_draft: ScheduleDraft) => Promise<boolean>
  onClose: () => void
}

interface FieldError {
  field: 'startTime' | 'durationInput'
  code: ScheduleErrorCode
}

function parseDuration(value: string): number | null {
  const parsed = parseDurationInput(value.trim())
  return parsed.ok ? parsed.minutes : null
}

export function ScheduleTaskDialog({
  open,
  mode,
  task,
  date,
  locale,
  dateStyle,
  initialStartTime,
  initialDurationInput,
  conflictsFor,
  pending,
  onConfirm,
  onClose,
}: ScheduleTaskDialogProps) {
  const { t } = useTranslation('agenda')
  const dialogRef = useRef<HTMLDialogElement>(null)
  const startRef = useRef<HTMLInputElement>(null)
  const [draft, setDraft] = useState<ScheduleDraft>({
    taskId: task.id,
    date,
    startTime: initialStartTime ?? '',
    durationInput: initialDurationInput,
    acknowledgedConflicts: false,
  })
  const [errors, setErrors] = useState<FieldError[]>([])
  const [failed, setFailed] = useState(false)

  const { handleKeyDown, handleCancel } = useDialogFocusTrap({
    open,
    dialogRef,
    initialFocusRef: startRef,
    onClose,
  })

  if (!open) return null

  const conflicts = draft.startTime ? conflictsFor(draft.startTime) : []
  const resolvedDuration =
    task.estimatedMinutes ?? parseDuration(draft.durationInput)
  const startValid = /^([01]\d|2[0-3]):[0-5]\d$/.test(draft.startTime)
  const previewEnd =
    startValid && resolvedDuration !== null
      ? minutesOfDayToLabel(
          minutesFromStart(draft.startTime) + resolvedDuration,
          locale,
          t('entry.endOfDay'),
        )
      : null

  function updateStart(startTime: string): void {
    setDraft((current) => ({
      ...current,
      startTime,
      acknowledgedConflicts: false,
    }))
    setErrors([])
  }

  function validate(): FieldError[] {
    const next: FieldError[] = []
    if (draft.startTime.trim().length === 0) {
      next.push({ field: 'startTime', code: 'START_TIME_REQUIRED' })
    } else if (!startValid) {
      next.push({ field: 'startTime', code: 'START_TIME_INVALID' })
    }

    let duration = task.estimatedMinutes
    if (duration === undefined) {
      if (draft.durationInput.trim().length === 0) {
        next.push({ field: 'durationInput', code: 'DURATION_REQUIRED' })
      } else {
        const parsed = parseDuration(draft.durationInput)
        if (parsed === null) {
          next.push({ field: 'durationInput', code: 'DURATION_INVALID' })
        } else {
          duration = parsed
        }
      }
    }

    if (
      next.length === 0 &&
      duration !== undefined &&
      startValid &&
      minutesFromStart(draft.startTime) + duration > DAY_END_MINUTES
    ) {
      next.push({ field: 'durationInput', code: 'ENDS_AFTER_MIDNIGHT' })
    }

    return next
  }

  async function submit(): Promise<void> {
    if (pending) return
    const nextErrors = validate()
    if (nextErrors.length > 0) {
      setErrors(nextErrors)
      return
    }
    const saved = await onConfirm(draft)
    if (saved) {
      onClose()
    } else {
      setFailed(true)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-modal="true"
      aria-labelledby="schedule-dialog-heading"
      onCancel={handleCancel}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
      className="w-full max-w-md rounded-2xl border border-border bg-surface p-5 text-text shadow-card backdrop:bg-canvas/80"
    >
      <h2
        id="schedule-dialog-heading"
        className="text-title font-semibold text-text"
      >
        {mode === 'move'
          ? t('dialog.moveTitle', { title: task.title })
          : t('dialog.scheduleTitle', { title: task.title })}
      </h2>

      <p className="mt-2 text-caption text-text-muted">
        {t('dialog.date')}: {formatLocalDate(date, locale, dateStyle)}
      </p>

      <div className="mt-3 space-y-3">
        <label className="flex flex-col gap-1 text-caption font-medium text-text">
          {t('dialog.startTime')}
          <input
            ref={startRef}
            type="time"
            value={draft.startTime}
            onChange={(event) => updateStart(event.target.value)}
            aria-describedby={
              errors.some((error) => error.field === 'startTime')
                ? 'schedule-error-summary'
                : undefined
            }
            className="min-h-11 rounded-control border border-border-strong bg-surface px-control py-2 text-body text-text"
          />
        </label>

        {task.estimatedMinutes === undefined ? (
          <label className="flex flex-col gap-1 text-caption font-medium text-text">
            {t('dialog.duration')}
            <input
              type="text"
              value={draft.durationInput}
              placeholder={t('dialog.durationHint')}
              onChange={(event) => {
                setDraft((current) => ({
                  ...current,
                  durationInput: event.target.value,
                }))
                setErrors([])
              }}
              aria-describedby={
                errors.some((error) => error.field === 'durationInput')
                  ? 'schedule-error-summary'
                  : undefined
              }
              className="min-h-11 rounded-control border border-border-strong bg-surface px-control py-2 text-body text-text"
            />
          </label>
        ) : null}

        {previewEnd ? (
          <p className="text-caption tabular-nums text-text-muted">
            {t('dialog.derivedEnd', { time: previewEnd })}
          </p>
        ) : null}
      </div>

      {errors.length > 0 ? (
        <div
          id="schedule-error-summary"
          className="mt-3 rounded-control border border-danger p-2 text-caption text-danger"
        >
          <p className="font-medium">{t('dialog.errorsHeading')}</p>
          <ul>
            {errors.map((error) => (
              <li key={`${error.field}-${error.code}`}>
                {t(`dialog.codes.${error.code}`)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {conflicts.length > 0 ? (
        <div className="mt-3 space-y-2 rounded-control border border-warning p-2 text-caption text-warning">
          <p className="font-medium">{t('dialog.conflictsHeading')}</p>
          <ul>
            {conflicts.map((conflict) => (
              <li key={conflict.entryKey}>
                {t('dialog.conflictEntry', {
                  title: conflict.title,
                  start: minutesOfDayToLabel(
                    conflict.overlapStartMinutes,
                    locale,
                    t('entry.endOfDay'),
                  ),
                  end: minutesOfDayToLabel(
                    conflict.overlapEndMinutes,
                    locale,
                    t('entry.endOfDay'),
                  ),
                })}
              </li>
            ))}
          </ul>
          <label className="flex items-start gap-2 text-text">
            <input
              type="checkbox"
              checked={draft.acknowledgedConflicts}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  acknowledgedConflicts: event.target.checked,
                }))
              }
              className="mt-1 h-4 w-4"
            />
            {t('dialog.acknowledge')}
          </label>
        </div>
      ) : null}

      {failed ? (
        <p className="mt-3 text-caption text-danger">{t('dialog.failure')}</p>
      ) : null}

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <Button
          onClick={() => {
            void submit()
          }}
          disabled={
            pending || (conflicts.length > 0 && !draft.acknowledgedConflicts)
          }
        >
          {pending
            ? t('dialog.pending')
            : mode === 'move'
              ? t('dialog.moveConfirm')
              : t('dialog.confirm')}
        </Button>
        <Button variant="secondary" onClick={onClose}>
          {t('dialog.cancel')}
        </Button>
      </div>
    </dialog>
  )
}

function minutesFromStart(startTime: string): number {
  const [hours, minutes] = startTime.split(':')
  return (
    Number.parseInt(hours ?? '0', 10) * 60 + Number.parseInt(minutes ?? '0', 10)
  )
}

function minutesOfDayToLabel(
  minutes: number,
  locale: string,
  endOfDayLabel: string,
): string {
  return minutesToTimeLabel(minutes, locale, endOfDayLabel)
}

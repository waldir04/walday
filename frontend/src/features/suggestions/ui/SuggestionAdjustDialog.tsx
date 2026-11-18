import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDialogFocusTrap } from '@/shared/lib/useDialogFocusTrap'
import {
  formatLocalTime,
  isLocalTime,
  parseLocalTime,
} from '@/shared/lib/localDateTime'
import type {
  SuggestionApplyOutcome,
  SuggestionConflictLink,
  SuggestionView,
} from '../model/types'

export interface SuggestionAdjustDialogProps {
  open: boolean
  suggestion: SuggestionView
  locale: string
  dateStyle: Intl.DateTimeFormatOptions['dateStyle']
  conflictsFor: (_startTime: string) => SuggestionConflictLink[]
  pending: boolean
  nowMinutes?: number
  onConfirm: (_input: {
    startTime: string
    acknowledged: boolean
  }) => Promise<SuggestionApplyOutcome>
  onClose: () => void
}

const DAY_END_MINUTES = 1440

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function minutesToTime(minutes: number): string {
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`
}

function timeLabel(minutes: number, locale: string, endOfDay: string): string {
  if (minutes >= DAY_END_MINUTES) return endOfDay
  const safe = Math.max(0, Math.floor(minutes))
  return formatLocalTime(
    `${pad(Math.floor(safe / 60))}:${pad(safe % 60)}`,
    locale,
  )
}

export function SuggestionAdjustDialog({
  open,
  suggestion,
  locale,
  conflictsFor,
  pending,
  nowMinutes,
  onConfirm,
  onClose,
}: SuggestionAdjustDialogProps) {
  const { t } = useTranslation('suggestions')
  const dialogRef = useRef<HTMLDialogElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [startTime, setStartTime] = useState(() =>
    minutesToTime(suggestion.proposedStartMinutes),
  )
  const [acknowledged, setAcknowledged] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)

  const { handleKeyDown, handleCancel } = useDialogFocusTrap({
    open,
    dialogRef,
    initialFocusRef: inputRef,
    onClose,
  })

  const parsed = isLocalTime(startTime) ? parseLocalTime(startTime) : null
  const startMinutes = parsed ? parsed.hours * 60 + parsed.minutes : null
  const endMinutes =
    startMinutes === null ? null : startMinutes + suggestion.durationMinutes
  const endOfDay = t('time.endOfDay')

  const errorKey = useMemo(() => {
    if (startTime.trim().length === 0 || !parsed || startMinutes === null) {
      return 'invalidTime'
    }
    if (endMinutes !== null && endMinutes > DAY_END_MINUTES) {
      return 'endsAfterMidnight'
    }
    if (nowMinutes !== undefined && startMinutes < nowMinutes) {
      return 'pastTime'
    }
    return null
  }, [endMinutes, nowMinutes, parsed, startMinutes, startTime])

  if (!open) return null

  const conflicts =
    errorKey === null && startTime ? conflictsFor(startTime) : []
  const blockedByConflicts = conflicts.length > 0 && !acknowledged

  async function confirm(): Promise<void> {
    if (errorKey !== null || blockedByConflicts) return
    setFailure(null)
    const outcome = await onConfirm({ startTime, acknowledged })
    if (outcome.ok) {
      onClose()
      return
    }
    if (outcome.code === 'invalid-time') {
      setFailure(t('adjust.invalidTime'))
    } else if (outcome.code === 'stale-target') {
      setFailure(t('adjust.failed'))
    } else {
      setFailure(t('adjust.failed'))
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-modal="true"
      aria-labelledby="suggestion-adjust-heading"
      className="w-full max-w-lg rounded-2xl border border-border bg-surface p-5 text-text"
      onKeyDown={handleKeyDown}
      onCancel={handleCancel}
    >
      <div className="space-y-4">
        <div className="space-y-1">
          <h2
            id="suggestion-adjust-heading"
            className="text-title font-semibold"
          >
            {t('adjust.heading')}
          </h2>
          <p className="text-caption text-text-muted">
            {t('adjust.description')}
          </p>
        </div>

        <dl className="space-y-1 text-caption">
          {suggestion.currentLabel ? (
            <div>
              <dt className="inline font-medium">
                {t('adjust.current', { time: suggestion.currentLabel })}
              </dt>
            </div>
          ) : null}
          <div>
            <dt className="inline font-medium">
              {t('adjust.proposed', { time: suggestion.proposedLabel })}
            </dt>
          </div>
          <div>
            <dt className="inline">
              {t('adjust.duration', {
                duration: suggestion.durationLabel ?? '',
              })}
            </dt>
          </div>
          <div>
            <dt className="inline tabular-nums">
              {t('adjust.adjusted', {
                time:
                  startMinutes === null
                    ? '—'
                    : `${timeLabel(startMinutes, locale, endOfDay)} – ${timeLabel(
                        startMinutes + suggestion.durationMinutes,
                        locale,
                        endOfDay,
                      )}`,
              })}
            </dt>
          </div>
        </dl>

        <div className="space-y-1">
          <label
            htmlFor="suggestion-adjust-start"
            className="text-caption font-medium"
          >
            {t('adjust.startTime')}
          </label>
          <input
            ref={inputRef}
            id="suggestion-adjust-start"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={startTime}
            aria-describedby={
              errorKey !== null ? 'suggestion-adjust-error' : undefined
            }
            aria-invalid={errorKey !== null}
            className="min-h-11 w-full rounded-control border border-border-strong bg-surface-raised px-3 py-2 text-body tabular-nums text-text"
            onChange={(event) => {
              setStartTime(event.target.value)
              setAcknowledged(false)
              setFailure(null)
            }}
          />
          {errorKey !== null ? (
            <p
              id="suggestion-adjust-error"
              className="text-caption text-danger"
            >
              {t(`adjust.${errorKey}`)}
            </p>
          ) : null}
        </div>

        {conflicts.length > 0 ? (
          <div className="space-y-2 rounded-control border border-warning p-3">
            <p className="text-caption font-medium text-warning">
              {t('adjust.conflictHeading')}
            </p>
            <ul className="space-y-1 text-caption">
              {conflicts.map((conflict) => (
                <li key={`${conflict.title}-${conflict.startMinutes}`}>
                  {t('adjust.conflictItem', {
                    title: conflict.title,
                    start: timeLabel(conflict.startMinutes, locale, endOfDay),
                    end: timeLabel(conflict.endMinutes, locale, endOfDay),
                  })}
                </li>
              ))}
            </ul>
            <label className="flex items-center gap-2 text-caption">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(event) => setAcknowledged(event.target.checked)}
              />
              {t('adjust.conflictAcknowledge')}
            </label>
          </div>
        ) : null}

        {failure ? (
          <p role="alert" className="text-caption text-danger">
            {failure}
          </p>
        ) : null}

        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className="inline-flex min-h-11 items-center rounded-control border border-border-strong px-4 py-2 text-body font-medium text-text"
            onClick={onClose}
            disabled={pending}
          >
            {t('actions.cancel')}
          </button>
          <button
            type="button"
            className="inline-flex min-h-11 items-center rounded-control bg-primary px-4 py-2 text-body font-medium text-text-inverse disabled:opacity-60"
            onClick={() => {
              void confirm()
            }}
            disabled={pending || errorKey !== null || blockedByConflicts}
          >
            {pending ? t('actions.pending') : t('actions.confirm')}
          </button>
        </div>
      </div>
    </dialog>
  )
}

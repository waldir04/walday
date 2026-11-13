import type { RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import {
  errorsByField,
  validationMessageKey,
  type Commitment,
  type CommitmentDraft,
  type CommitmentField,
  type CommitmentFieldError,
} from '@/entities/commitment'
import { formatLocalTime } from '@/shared/lib/localDateTime'
import { Button } from '@/shared/ui/Button'

export interface CommitmentFormProps {
  draft: CommitmentDraft
  editing: boolean
  errors: CommitmentFieldError[]
  conflicts: Commitment[]
  acknowledged: boolean
  pending: boolean
  disabled: boolean
  formattingLocale: string
  titleRef?: RefObject<HTMLInputElement | null>
  summaryRef?: RefObject<HTMLDivElement | null>
  onFieldChange: (_field: keyof CommitmentDraft, _value: string) => void
  onAcknowledgedChange: (_checked: boolean) => void
  onSave: () => void
  onCancel: () => void
  onDecline: () => void
}

const FIELD_IDS: Record<CommitmentField, string> = {
  title: 'commitment-title',
  description: 'commitment-description',
  date: 'commitment-date',
  startTime: 'commitment-start',
  endTime: 'commitment-end',
  type: 'commitment-type',
  range: 'commitment-end',
}

const INPUT_CLASS =
  'rounded-control border border-border bg-surface px-control py-2 text-body text-text'

export function CommitmentForm({
  draft,
  editing,
  errors,
  conflicts,
  acknowledged,
  pending,
  disabled,
  formattingLocale,
  titleRef,
  summaryRef,
  onFieldChange,
  onAcknowledgedChange,
  onSave,
  onCancel,
  onDecline,
}: CommitmentFormProps) {
  const { t } = useTranslation('commitments')
  const byField = errorsByField(errors)
  const requiresAck = conflicts.length > 0
  const saveDisabled = pending || disabled || (requiresAck && !acknowledged)

  function fieldErrorId(field: CommitmentField): string | undefined {
    return byField[field] ? `${FIELD_IDS[field]}-error` : undefined
  }

  function errorText(field: CommitmentField) {
    const code = byField[field]
    if (!code) return null
    return (
      <p id={`${FIELD_IDS[field]}-error`} className="text-caption text-danger">
        {t(validationMessageKey(code))}
      </p>
    )
  }

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        onSave()
      }}
      aria-labelledby="commitment-form-heading"
      className="rounded-card border border-border bg-surface p-section shadow-card"
    >
      <h2
        id="commitment-form-heading"
        className="text-title font-semibold text-text"
      >
        {editing
          ? t('commitments.form.editingHeading')
          : t('commitments.form.heading')}
      </h2>

      {errors.length > 1 ? (
        <div
          ref={summaryRef}
          tabIndex={-1}
          role="alert"
          className="mt-4 rounded-control border border-danger bg-surface p-control text-body text-danger"
        >
          <p className="font-semibold">{t('commitments.validation.summary')}</p>
          <ul className="mt-1 list-inside list-disc">
            {errors.map((error) => (
              <li key={`${error.field}-${error.code}`}>
                {t(validationMessageKey(error.code))}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-4 grid gap-4">
        <div className="grid gap-1">
          <label
            htmlFor={FIELD_IDS.title}
            className="text-caption font-medium text-text"
          >
            {t('commitments.form.title')}
          </label>
          <input
            ref={titleRef}
            id={FIELD_IDS.title}
            value={draft.title}
            onChange={(event) => onFieldChange('title', event.target.value)}
            placeholder={t('commitments.form.titlePlaceholder')}
            aria-invalid={Boolean(byField.title)}
            aria-describedby={fieldErrorId('title')}
            disabled={pending || disabled}
            className={INPUT_CLASS}
          />
          {errorText('title')}
        </div>

        <div className="grid gap-1">
          <label
            htmlFor={FIELD_IDS.description}
            className="text-caption font-medium text-text"
          >
            {t('commitments.form.description')}
          </label>
          <textarea
            id={FIELD_IDS.description}
            value={draft.description}
            onChange={(event) =>
              onFieldChange('description', event.target.value)
            }
            placeholder={t('commitments.form.descriptionPlaceholder')}
            aria-invalid={Boolean(byField.description)}
            aria-describedby={fieldErrorId('description')}
            disabled={pending || disabled}
            rows={3}
            className={INPUT_CLASS}
          />
          {errorText('description')}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1">
            <label
              htmlFor={FIELD_IDS.date}
              className="text-caption font-medium text-text"
            >
              {t('commitments.form.date')}
            </label>
            <input
              id={FIELD_IDS.date}
              type="date"
              value={draft.date}
              onChange={(event) => onFieldChange('date', event.target.value)}
              aria-invalid={Boolean(byField.date)}
              aria-describedby={fieldErrorId('date')}
              disabled={pending || disabled}
              className={INPUT_CLASS}
            />
            {errorText('date')}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="grid gap-1">
              <label
                htmlFor={FIELD_IDS.startTime}
                className="text-caption font-medium text-text"
              >
                {t('commitments.form.startTime')}
              </label>
              <input
                id={FIELD_IDS.startTime}
                type="time"
                value={draft.startTime}
                onChange={(event) =>
                  onFieldChange('startTime', event.target.value)
                }
                aria-invalid={Boolean(byField.startTime)}
                aria-describedby={fieldErrorId('startTime')}
                disabled={pending || disabled}
                className={INPUT_CLASS}
              />
              {errorText('startTime')}
            </div>
            <div className="grid gap-1">
              <label
                htmlFor={FIELD_IDS.endTime}
                className="text-caption font-medium text-text"
              >
                {t('commitments.form.endTime')}
              </label>
              <input
                id={FIELD_IDS.endTime}
                type="time"
                value={draft.endTime}
                onChange={(event) =>
                  onFieldChange('endTime', event.target.value)
                }
                aria-invalid={Boolean(byField.endTime)}
                aria-describedby={fieldErrorId('endTime')}
                disabled={pending || disabled}
                className={INPUT_CLASS}
              />
              {errorText('endTime')}
            </div>
          </div>
        </div>

        <fieldset
          id={FIELD_IDS.type}
          aria-describedby={fieldErrorId('type')}
          className="grid gap-2"
        >
          <legend className="text-caption font-medium text-text">
            {t('commitments.form.type')}
          </legend>
          <p className="text-caption text-text-muted">
            {t('commitments.form.typeHelp')}
          </p>
          <label className="flex items-start gap-2 text-body text-text">
            <input
              type="radio"
              name="commitment-type"
              value="fixed"
              checked={draft.type === 'fixed'}
              onChange={() => onFieldChange('type', 'fixed')}
              disabled={pending || disabled}
              className="mt-1"
            />
            <span>
              <span className="font-medium">
                {t('commitments.form.typeFixed')}
              </span>
              <span className="block text-caption text-text-muted">
                {t('commitments.form.typeFixedDesc')}
              </span>
            </span>
          </label>
          <label className="flex items-start gap-2 text-body text-text">
            <input
              type="radio"
              name="commitment-type"
              value="flexible"
              checked={draft.type === 'flexible'}
              onChange={() => onFieldChange('type', 'flexible')}
              disabled={pending || disabled}
              className="mt-1"
            />
            <span>
              <span className="font-medium">
                {t('commitments.form.typeFlexible')}
              </span>
              <span className="block text-caption text-text-muted">
                {t('commitments.form.typeFlexibleDesc')}
              </span>
            </span>
          </label>
          {errorText('type')}
        </fieldset>

        {requiresAck ? (
          <section
            aria-labelledby="commitment-overlap-heading"
            className="rounded-control border border-warning bg-surface-subtle p-control"
          >
            <h3
              id="commitment-overlap-heading"
              tabIndex={-1}
              className="text-body font-semibold text-warning"
            >
              {t('commitments.overlap.heading')}
            </h3>
            <p className="mt-1 text-body text-text">
              {t('commitments.overlap.message')}
            </p>
            <p className="mt-1 text-caption text-text-muted">
              {t('commitments.overlap.details')}
            </p>
            <ul
              aria-label={t('commitments.overlap.conflictsLabel')}
              className="mt-2 list-inside list-disc text-body text-text"
            >
              {conflicts.map((conflict) => (
                <li key={conflict.id}>
                  {conflict.title} ·{' '}
                  {formatLocalTime(conflict.startTime, formattingLocale)}–
                  {formatLocalTime(conflict.endTime, formattingLocale)}
                </li>
              ))}
            </ul>
            <label className="mt-3 flex items-start gap-2 text-body text-text">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(event) => onAcknowledgedChange(event.target.checked)}
                className="mt-1"
              />
              <span>
                {t('commitments.overlap.acknowledge')}
                <span className="block text-caption text-text-muted">
                  {t('commitments.overlap.acknowledgeHelp')}
                </span>
              </span>
            </label>
          </section>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="submit" disabled={saveDisabled}>
          {pending ? t('commitments.saving') : t('commitments.save')}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={requiresAck ? onDecline : onCancel}
        >
          {requiresAck
            ? t('commitments.overlap.decline')
            : t('commitments.cancel')}
        </Button>
      </div>
    </form>
  )
}

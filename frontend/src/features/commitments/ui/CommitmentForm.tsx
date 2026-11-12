import { type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import type {
  CommitmentFormDraft,
  CommitmentErrors,
} from '../model/useCommitments'

interface Props {
  draft: CommitmentFormDraft
  errors: CommitmentErrors
  overlap?: { message: string; details: string } | null
  onChange: (_draft: CommitmentFormDraft) => void
  onSave: (_draft: CommitmentFormDraft) => void
  isLoading?: boolean
}

export function CommitmentForm({
  draft,
  errors,
  overlap,
  onChange,
  onSave,
  isLoading = false,
}: Props) {
  const { t } = useTranslation('commitments')

  function handleChange(field: keyof CommitmentFormDraft, value: string) {
    onChange({ ...draft, [field]: value })
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSave(draft)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-4 max-w-xl space-y-4"
      aria-label={t('commitments.heading')}
    >
      <div>
        <label htmlFor="commit-title" className="block text-sm font-medium">
          {t('commitments.title')}
        </label>
        <input
          id="commit-title"
          type="text"
          className="mt-1 w-full rounded border px-3 py-2"
          placeholder={t('commitments.titlePlaceholder')}
          value={draft.title}
          onChange={(e) => handleChange('title', e.target.value)}
          aria-invalid={!!errors.title}
          aria-describedby={errors.title ? 'commit-title-error' : undefined}
        />
        {errors.title ? (
          <p
            id="commit-title-error"
            className="mt-1 text-sm text-red-700"
            role="alert"
          >
            {t(errors.title)}
          </p>
        ) : null}
      </div>

      <div>
        <label
          htmlFor="commit-description"
          className="block text-sm font-medium"
        >
          {t('commitments.description')}
        </label>
        <textarea
          id="commit-description"
          className="mt-1 w-full rounded border px-3 py-2"
          placeholder={t('commitments.descriptionPlaceholder')}
          value={draft.description}
          onChange={(e) => handleChange('description', e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="commit-date" className="block text-sm font-medium">
            {t('commitments.date')}
          </label>
          <input
            id="commit-date"
            type="date"
            className="mt-1 w-full rounded border px-3 py-2"
            value={draft.date}
            onChange={(e) => handleChange('date', e.target.value)}
            aria-invalid={!!errors.date}
            aria-describedby={errors.date ? 'commit-date-error' : undefined}
          />
          {errors.date ? (
            <p
              id="commit-date-error"
              className="mt-1 text-sm text-red-700"
              role="alert"
            >
              {t(errors.date)}
            </p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor="commit-start-time"
            className="block text-sm font-medium"
          >
            {t('commitments.startTime')}
          </label>
          <input
            id="commit-start-time"
            type="time"
            className="mt-1 w-full rounded border px-3 py-2"
            value={draft.startTime}
            onChange={(e) => handleChange('startTime', e.target.value)}
            aria-invalid={!!errors.startTime}
            aria-describedby={
              errors.startTime ? 'commit-start-error' : undefined
            }
          />
          {errors.startTime ? (
            <p
              id="commit-start-error"
              className="mt-1 text-sm text-red-700"
              role="alert"
            >
              {t(errors.startTime)}
            </p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor="commit-end-time"
            className="block text-sm font-medium"
          >
            {t('commitments.endTime')}
          </label>
          <input
            id="commit-end-time"
            type="time"
            className="mt-1 w-full rounded border px-3 py-2"
            value={draft.endTime}
            onChange={(e) => handleChange('endTime', e.target.value)}
            aria-invalid={!!errors.endTime}
            aria-describedby={errors.endTime ? 'commit-end-error' : undefined}
          />
          {errors.endTime ? (
            <p
              id="commit-end-error"
              className="mt-1 text-sm text-red-700"
              role="alert"
            >
              {t(errors.endTime)}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col">
          <label className="block text-sm font-medium">
            {t('commitments.type')}
          </label>
          <div className="mt-1 flex gap-3">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="radio"
                name="commit-type"
                value="fixed"
                checked={draft.type === 'fixed'}
                onChange={() => handleChange('type', 'fixed')}
                aria-invalid={!!errors.type}
              />
              <span>
                {t('commitments.typeFixed')}{' '}
                <span className="text-xs text-gray-500">
                  {t('commitments.typeFixedDesc')}
                </span>
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="radio"
                name="commit-type"
                value="flexible"
                checked={draft.type === 'flexible'}
                onChange={() => handleChange('type', 'flexible')}
                aria-invalid={!!errors.type}
              />
              <span>
                {t('commitments.typeFlexible')}{' '}
                <span className="text-xs text-gray-500">
                  {t('commitments.typeFlexibleDesc')}
                </span>
              </span>
            </label>
          </div>
          {errors.type ? (
            <p className="mt-1 text-sm text-red-700" role="alert">
              {t(errors.type)}
            </p>
          ) : null}
        </div>

        {errors.range ? (
          <div className="col-span-2">
            <p className="mt-1 text-sm text-red-700" role="alert">
              {t(errors.range)}
            </p>
          </div>
        ) : null}
      </div>

      {overlap ? (
        <div
          className="mt-2 rounded bg-amber-50 p-3 border border-amber-200"
          role="alert"
        >
          <p className="text-sm font-medium text-amber-800">
            {t(overlap.message)}
          </p>
          <p className="mt-1 text-sm text-amber-700">{t(overlap.details)}</p>
        </div>
      ) : null}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isLoading}
          className="rounded bg-gray-900 px-4 py-2 text-white disabled:opacity-50"
        >
          {t('commitments.save')}
        </button>
        <button
          type="button"
          onClick={() => onChange(draft)}
          className="rounded border border-gray-300 px-4 py-2 text-gray-700"
        >
          {t('commitments.cancel')}
        </button>
      </div>
    </form>
  )
}

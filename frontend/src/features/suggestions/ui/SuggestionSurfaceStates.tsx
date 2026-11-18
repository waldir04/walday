import { useTranslation } from 'react-i18next'
import { Link } from '@/shared/ui/Link'
import type { NoSuggestionReason } from '../model/types'

export function SuggestionSurfaceSkeleton() {
  const { t } = useTranslation('suggestions')
  return (
    <div className="space-y-3">
      <p className="sr-only">{t('loading')}</p>
      {[0, 1].map((index) => (
        <div
          key={index}
          aria-hidden="true"
          className="space-y-3 rounded-2xl border border-suggestion-surface-strong bg-suggestion-surface-strong/40 p-4"
        >
          <div className="h-5 w-24 animate-pulse rounded-full bg-suggestion-surface" />
          <div className="h-5 w-2/3 animate-pulse rounded-control bg-suggestion-surface" />
          <div className="h-4 w-1/2 animate-pulse rounded-control bg-suggestion-surface" />
          <div className="h-4 w-3/4 animate-pulse rounded-control bg-suggestion-surface" />
          <div className="h-11 w-40 animate-pulse rounded-control bg-suggestion-surface" />
        </div>
      ))}
    </div>
  )
}

export interface SuggestionUnavailableStateProps {
  kind: 'incomplete' | 'error'
  onRetry: () => void
}

export function SuggestionUnavailableState({
  kind,
  onRetry,
}: SuggestionUnavailableStateProps) {
  const { t } = useTranslation('suggestions')
  return (
    <div className="space-y-3">
      <p className="text-body text-suggestion-text">
        {kind === 'incomplete' ? t('incomplete') : t('error')}
      </p>
      <button
        type="button"
        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-control bg-suggestion-cta px-4 py-2 text-body font-medium text-white"
        onClick={onRetry}
      >
        {t('actions.retry')}
      </button>
    </div>
  )
}

export interface SuggestionNoResultsStateProps {
  reason: NoSuggestionReason | null
}

export function SuggestionNoResultsState({
  reason,
}: SuggestionNoResultsStateProps) {
  const { t } = useTranslation('suggestions')

  const reasonKey = reason ?? 'nothing-actionable'

  return (
    <div className="space-y-3">
      <h3 className="text-body font-semibold text-suggestion-text">
        {t('states.noSuggestions.heading')}
      </h3>
      <p className="text-caption text-suggestion-text">
        {t(`states.noSuggestions.${camelReason(reasonKey)}`)}
      </p>
      <div className="flex flex-wrap gap-3">
        {reason === 'missing-durations' || reason === 'day-already-planned' ? (
          <Link
            to="/tasks"
            className="text-body font-medium text-suggestion-text underline underline-offset-4"
          >
            {t('states.openTasks')}
          </Link>
        ) : (
          <Link
            to="/"
            className="text-body font-medium text-suggestion-text underline underline-offset-4"
          >
            {t('states.openAgenda')}
          </Link>
        )}
      </div>
    </div>
  )
}

function camelReason(reason: NoSuggestionReason): string {
  switch (reason) {
    case 'all-dismissed':
      return 'allDismissed'
    case 'day-already-planned':
      return 'dayAlreadyPlanned'
    case 'missing-durations':
      return 'missingDurations'
    case 'no-free-period':
      return 'noFreePeriod'
    case 'nothing-actionable':
      return 'nothingActionable'
  }
}

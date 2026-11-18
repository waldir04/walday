import { useTranslation } from 'react-i18next'
import { useId, useState } from 'react'
import type { SuggestionView } from '../model/types'

export interface SuggestionDismissedReviewProps {
  dismissed: readonly SuggestionView[]
  pendingId: string | null
  onRestore: (_suggestionId: string) => void
}

export function SuggestionDismissedReview({
  dismissed,
  pendingId,
  onRestore,
}: SuggestionDismissedReviewProps) {
  const { t } = useTranslation('suggestions')
  const [expanded, setExpanded] = useState(false)
  const regionId = useId()

  if (dismissed.length === 0) return null

  return (
    <div className="space-y-2">
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={regionId}
        data-dismissed-review="true"
        className="inline-flex min-h-11 items-center rounded-control text-body font-medium text-suggestion-text underline underline-offset-4"
        onClick={() => setExpanded((current) => !current)}
      >
        {expanded ? t('actions.hideDismissed') : t('actions.reviewDismissed')}
      </button>

      {expanded ? (
        <div id={regionId} className="space-y-2">
          <h3 className="text-caption font-semibold text-suggestion-text">
            {t('states.dismissedHeading')}
          </h3>
          <ul className="space-y-2">
            {dismissed.map((suggestion) => (
              <li
                key={suggestion.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-control border border-suggestion-surface-strong bg-suggestion-surface px-3 py-2 text-caption text-suggestion-text"
              >
                <span>
                  <span className="font-semibold">
                    {suggestion.targetTitle}
                  </span>
                  {': '}
                  {suggestion.proposedLabel}
                </span>
                <button
                  type="button"
                  className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-control border border-suggestion-text px-3 py-1 font-medium text-suggestion-text"
                  aria-label={t('actions.restoreLabel', {
                    title: suggestion.targetTitle,
                  })}
                  disabled={pendingId === suggestion.id}
                  onClick={() => onRestore(suggestion.id)}
                >
                  {t('actions.restore')}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

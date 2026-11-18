import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { SuggestionView } from '../model/types'

export interface SuggestionActionsProps {
  suggestion: SuggestionView
  pending: boolean
  onAccept: () => void
  onAdjust: () => void
  onDismiss: () => void
}

type ActionKey = 'accept' | 'adjust' | 'dismiss'

const ACTION_CLASSES =
  'inline-flex min-h-11 min-w-11 items-center justify-center rounded-control px-4 py-2 text-body font-medium disabled:cursor-not-allowed disabled:opacity-60'

export function SuggestionActions({
  suggestion,
  pending,
  onAccept,
  onAdjust,
  onDismiss,
}: SuggestionActionsProps) {
  const { t } = useTranslation('suggestions')
  const [lastAction, setLastAction] = useState<ActionKey | null>(null)

  const acceptLabel =
    suggestion.category === 'slot'
      ? t('actions.acceptScheduleLabel', {
          title: suggestion.targetTitle,
          time: suggestion.proposedLabel,
        })
      : t('actions.acceptLabel', {
          title: suggestion.targetTitle,
          time: suggestion.proposedLabel,
        })

  function labelFor(action: ActionKey, label: string): string {
    return pending && lastAction === action
      ? `${label} — ${t('actions.pending')}`
      : label
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        className={`${ACTION_CLASSES} bg-suggestion-cta text-white hover:opacity-90`}
        data-suggestion-accept={suggestion.id}
        aria-label={labelFor('accept', acceptLabel)}
        disabled={pending}
        onClick={() => {
          setLastAction('accept')
          onAccept()
        }}
      >
        {pending && lastAction === 'accept'
          ? t('actions.pending')
          : t('actions.accept')}
      </button>
      <button
        type="button"
        className={`${ACTION_CLASSES} border border-suggestion-text bg-transparent text-suggestion-text hover:bg-suggestion-surface-strong`}
        data-adjust-for={suggestion.id}
        aria-label={labelFor(
          'adjust',
          t('actions.adjustLabel', { title: suggestion.targetTitle }),
        )}
        disabled={pending}
        onClick={() => {
          setLastAction('adjust')
          onAdjust()
        }}
      >
        {pending && lastAction === 'adjust'
          ? t('actions.pending')
          : t('actions.adjust')}
      </button>
      <button
        type="button"
        className={`${ACTION_CLASSES} text-suggestion-text underline underline-offset-4 hover:bg-suggestion-surface-strong`}
        aria-label={labelFor(
          'dismiss',
          t('actions.dismissLabel', { title: suggestion.targetTitle }),
        )}
        disabled={pending}
        onClick={() => {
          setLastAction('dismiss')
          onDismiss()
        }}
      >
        {pending && lastAction === 'dismiss'
          ? t('actions.pending')
          : t('actions.dismiss')}
      </button>
    </div>
  )
}

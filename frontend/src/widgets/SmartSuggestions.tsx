import { useTranslation } from 'react-i18next'
import { Sparkles } from 'lucide-react'
import { Skeleton } from '@/shared/ui/Skeleton'

export interface SuggestionView {
  id: string
  title: string
  reason: string
}

export type SmartSuggestionsState =
  | { status: 'loading' }
  | { status: 'ready'; suggestions: SuggestionView[] }
  | { status: 'error' }

export interface SmartSuggestionsProps {
  state: SmartSuggestionsState
}

export function SmartSuggestions({ state }: SmartSuggestionsProps) {
  const { t } = useTranslation('home')

  if (state.status === 'ready' && state.suggestions.length === 0) return null

  if (state.status === 'loading') {
    return (
      <section
        aria-busy="true"
        aria-labelledby="suggestions-heading"
        className="space-y-3 rounded-2xl border border-suggestion-surface-strong bg-suggestion-surface p-5 text-suggestion-text"
      >
        <h2
          id="suggestions-heading"
          className="text-title font-semibold text-suggestion-text"
        >
          {t('suggestions.heading')}
        </h2>
        <p className="sr-only">{t('suggestions.loading')}</p>
        <Skeleton lines={2} className="max-w-md" />
      </section>
    )
  }

  if (state.status === 'error') {
    return (
      <section
        aria-labelledby="suggestions-heading"
        className="space-y-2 rounded-2xl border border-suggestion-surface-strong bg-suggestion-surface p-5 text-suggestion-text"
      >
        <h2
          id="suggestions-heading"
          className="text-title font-semibold text-suggestion-text"
        >
          {t('suggestions.heading')}
        </h2>
        <p className="text-body">{t('suggestions.error')}</p>
      </section>
    )
  }

  return (
    <section
      aria-labelledby="suggestions-heading"
      className="space-y-3 rounded-2xl border border-suggestion-surface-strong bg-suggestion-surface p-5 text-suggestion-text"
    >
      <h2
        id="suggestions-heading"
        className="flex items-center gap-2 text-title font-semibold text-suggestion-text"
      >
        <Sparkles aria-hidden="true" className="h-5 w-5" />
        {t('suggestions.heading')}
      </h2>
      <ul className="space-y-3">
        {state.suggestions.map((suggestion) => (
          <li
            key={suggestion.id}
            className="rounded-2xl border border-suggestion-surface-strong bg-suggestion-surface-strong/40 p-4"
          >
            <p className="text-body font-semibold text-suggestion-text">
              {suggestion.title}
            </p>
            <p className="mt-1 text-caption text-suggestion-text">
              <span className="font-medium">{t('suggestions.why')}: </span>
              {suggestion.reason}
            </p>
          </li>
        ))}
      </ul>
    </section>
  )
}

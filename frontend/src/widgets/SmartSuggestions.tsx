import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Sparkles } from 'lucide-react'
import type { WeatherUnit } from '@/entities/preferences'
import {
  SuggestionAdjustDialog,
  SuggestionCard,
  SuggestionDismissedReview,
  SuggestionNoResultsState,
  SuggestionSurfaceSkeleton,
  SuggestionUnavailableState,
  type SuggestionApplyOutcome,
  type SuggestionConflictLink,
  type SuggestionsSurfaceState,
} from '@/features/suggestions'

export interface SmartSuggestionsProps {
  state: SuggestionsSurfaceState
  locale: string
  dateStyle: Intl.DateTimeFormatOptions['dateStyle']
  weatherUnit: WeatherUnit
  onAccept: (_suggestionId: string) => Promise<void>
  onAdjust: (_input: {
    suggestionId: string
    startTime: string
    acknowledged: boolean
  }) => Promise<SuggestionApplyOutcome>
  onDismiss: (_suggestionId: string) => Promise<void>
  onRestore: (_suggestionId: string) => Promise<void>
  onRetry: () => void
  conflictsFor?: (
    _activityKey: string,
    _startTime: string,
  ) => SuggestionConflictLink[]
  nowMinutes?: number
}

export function SmartSuggestions({
  state,
  locale,
  dateStyle,
  weatherUnit,
  onAccept,
  onAdjust,
  onDismiss,
  onRestore,
  onRetry,
  conflictsFor,
  nowMinutes,
}: SmartSuggestionsProps) {
  const { t } = useTranslation('suggestions')
  const sectionRef = useRef<HTMLElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const [adjustId, setAdjustId] = useState<string | null>(null)

  const adjustSuggestion =
    state.status === 'ready'
      ? state.suggestions.find((suggestion) => suggestion.id === adjustId)
      : undefined

  function focusNext(): void {
    window.setTimeout(() => {
      const section = sectionRef.current
      const nextAccept = section?.querySelector<HTMLButtonElement>(
        '[data-suggestion-accept]',
      )
      if (nextAccept) {
        nextAccept.focus()
      } else {
        headingRef.current?.focus()
      }
    }, 0)
  }

  const busy =
    state.status === 'loading' ||
    (state.status === 'ready' && state.applyingId !== null)

  return (
    <section
      ref={sectionRef}
      aria-busy={busy ? 'true' : undefined}
      aria-labelledby="suggestions-heading"
      className="space-y-3 rounded-2xl border border-suggestion-surface-strong bg-suggestion-surface p-5 text-suggestion-text"
    >
      <h2
        ref={headingRef}
        id="suggestions-heading"
        tabIndex={-1}
        className="flex items-center gap-2 text-title font-semibold text-suggestion-text"
      >
        <Sparkles aria-hidden="true" className="h-5 w-5" />
        {t('heading')}
      </h2>

      {state.status === 'loading' ? <SuggestionSurfaceSkeleton /> : null}

      {state.status === 'incomplete' ? (
        <SuggestionUnavailableState kind="incomplete" onRetry={onRetry} />
      ) : null}

      {state.status === 'error' ? (
        <SuggestionUnavailableState kind="error" onRetry={onRetry} />
      ) : null}

      {state.status === 'ready' ? (
        <>
          {state.suggestions.length > 0 ? (
            <ul className="space-y-3">
              {state.suggestions.map((suggestion) => (
                <SuggestionCard
                  key={suggestion.id}
                  suggestion={suggestion}
                  locale={locale}
                  dateStyle={dateStyle}
                  weatherUnit={weatherUnit}
                  pending={state.applyingId === suggestion.id}
                  onAccept={() => {
                    void onAccept(suggestion.id).then(focusNext)
                  }}
                  onAdjust={() => setAdjustId(suggestion.id)}
                  onDismiss={() => {
                    void onDismiss(suggestion.id).then(focusNext)
                  }}
                />
              ))}
            </ul>
          ) : (
            <SuggestionNoResultsState reason={state.noSuggestionReason} />
          )}

          <SuggestionDismissedReview
            dismissed={state.dismissed}
            pendingId={state.applyingId}
            onRestore={(suggestionId) => {
              void onRestore(suggestionId)
            }}
          />
        </>
      ) : null}

      <p aria-live="polite" className="sr-only">
        {state.status === 'ready' ? (state.announcement ?? '') : ''}
      </p>

      {adjustSuggestion ? (
        <SuggestionAdjustDialog
          open
          suggestion={adjustSuggestion}
          locale={locale}
          dateStyle={dateStyle}
          nowMinutes={nowMinutes}
          conflictsFor={(startTime) =>
            conflictsFor?.(adjustSuggestion.activityKey, startTime) ?? []
          }
          pending={state.status === 'ready' && state.applyingId !== null}
          onConfirm={(input) =>
            onAdjust({ suggestionId: adjustSuggestion.id, ...input })
          }
          onClose={() => {
            setAdjustId(null)
            window.setTimeout(() => {
              sectionRef.current
                ?.querySelector<HTMLButtonElement>(
                  `[data-adjust-for="${adjustSuggestion.id}"]`,
                )
                ?.focus()
            }, 0)
          }}
        />
      ) : null}
    </section>
  )
}

import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { WeatherUnit } from '@/entities/preferences'
import type {
  SuggestionApplyOutcome,
  SuggestionConflictLink,
  SuggestionsSurfaceState,
} from '@/features/suggestions'
import { SmartSuggestions } from './SmartSuggestions'
import { WeatherCard, type WeatherCardState } from './WeatherCard'

export interface HomeDashboardProps {
  agenda: ReactNode
  selectedDateLabel: string
  showTodaySurfaces: boolean
  weather: WeatherCardState
  suggestions: SuggestionsSurfaceState
  formattingLocale: string
  dateStyle: Intl.DateTimeFormatOptions['dateStyle']
  weatherUnit: WeatherUnit
  weatherAnnouncement?: string | null
  onRefreshWeather?: () => void
  onRetryWeather?: () => void
  onAcceptSuggestion: (_suggestionId: string) => Promise<void>
  onAdjustSuggestion: (_input: {
    suggestionId: string
    startTime: string
    acknowledged: boolean
  }) => Promise<SuggestionApplyOutcome>
  onDismissSuggestion: (_suggestionId: string) => Promise<void>
  onRestoreSuggestion: (_suggestionId: string) => Promise<void>
  onRetrySuggestions: () => void
  suggestionConflictsFor?: (
    _activityKey: string,
    _startTime: string,
  ) => SuggestionConflictLink[]
  suggestionNowMinutes?: number
}

export function HomeDashboard({
  agenda,
  selectedDateLabel,
  showTodaySurfaces,
  weather,
  suggestions,
  formattingLocale,
  dateStyle,
  weatherUnit,
  weatherAnnouncement,
  onRefreshWeather,
  onRetryWeather,
  onAcceptSuggestion,
  onAdjustSuggestion,
  onDismissSuggestion,
  onRestoreSuggestion,
  onRetrySuggestions,
  suggestionConflictsFor,
  suggestionNowMinutes,
}: HomeDashboardProps) {
  const { t } = useTranslation('home')

  return (
    <div className="space-y-section">
      <div className="space-y-2">
        <p className="text-caption font-medium uppercase tracking-wide text-primary">
          {selectedDateLabel}
        </p>
        <h1 tabIndex={-1} className="text-display font-bold text-text">
          {t('heading')}
        </h1>
        <p className="text-body text-text-muted">{t('description')}</p>
      </div>

      {showTodaySurfaces ? (
        <>
          <WeatherCard
            state={weather}
            unit={weatherUnit}
            locale={formattingLocale}
            announcement={weatherAnnouncement}
            onRefresh={onRefreshWeather}
            onRetry={onRetryWeather}
          />
          <SmartSuggestions
            state={suggestions}
            locale={formattingLocale}
            dateStyle={dateStyle}
            weatherUnit={weatherUnit}
            onAccept={onAcceptSuggestion}
            onAdjust={onAdjustSuggestion}
            onDismiss={onDismissSuggestion}
            onRestore={onRestoreSuggestion}
            onRetry={onRetrySuggestions}
            conflictsFor={suggestionConflictsFor}
            nowMinutes={suggestionNowMinutes}
          />
        </>
      ) : null}

      {agenda}
    </div>
  )
}

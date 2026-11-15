import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { WeatherUnit } from '@/entities/preferences'
import {
  SmartSuggestions,
  type SmartSuggestionsState,
} from './SmartSuggestions'
import { WeatherCard, type WeatherCardState } from './WeatherCard'

export interface HomeDashboardProps {
  agenda: ReactNode
  selectedDateLabel: string
  showTodaySurfaces: boolean
  weather: WeatherCardState
  suggestions: SmartSuggestionsState
  formattingLocale: string
  weatherUnit: WeatherUnit
}

export function HomeDashboard({
  agenda,
  selectedDateLabel,
  showTodaySurfaces,
  weather,
  suggestions,
  formattingLocale,
  weatherUnit,
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
          />
          <SmartSuggestions state={suggestions} />
        </>
      ) : null}

      {agenda}
    </div>
  )
}

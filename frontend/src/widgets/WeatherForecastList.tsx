import { useTranslation } from 'react-i18next'
import { conditionLabelKey } from '@/entities/weather'
import { formatMeasurement, type WeatherUnit } from '@/entities/preferences'
import type { ForecastHour } from '@/features/weather'

export interface WeatherForecastListProps {
  hours: readonly ForecastHour[]
  unit: WeatherUnit
  locale: string
}

function percentage(value: number, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'percent',
      maximumFractionDigits: 0,
    }).format(value / 100)
  } catch {
    return `${value}%`
  }
}

export function WeatherForecastList({
  hours,
  unit,
  locale,
}: WeatherForecastListProps) {
  const { t } = useTranslation('home')

  if (hours.length === 0) return null

  return (
    <div className="space-y-2">
      <h3 className="text-body font-semibold text-text">
        {t('weather.forecastHeading')}
      </h3>
      <ol className="space-y-2">
        {hours.map((hour) => {
          const temperature = formatMeasurement(
            hour.temperature ?? undefined,
            unit,
            locale,
          )
          const probability =
            hour.precipitationProbability === null
              ? t('weather.precipitationProbabilityUnavailable')
              : t('weather.precipitationProbability', {
                  value: percentage(hour.precipitationProbability, locale),
                })
          return (
            <li
              key={hour.timeMs}
              className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-control bg-surface-raised px-3 py-2 text-caption"
            >
              <span className="min-w-16 font-medium tabular-nums text-text">
                {hour.isCurrentHour ? t('weather.now') : hour.hourLabel}
              </span>
              <span className="tabular-nums text-text">
                <span className="sr-only">
                  {t('weather.temperatureLabel')}:{' '}
                </span>
                {temperature ?? t('weather.unavailableValue')}
              </span>
              <span className="text-text-muted">
                <span className="sr-only">{t('weather.conditionLabel')}: </span>
                {t(`weather.conditions.${conditionLabelKey(hour.condition)}`)}
              </span>
              <span className="tabular-nums text-text-muted">
                {probability}
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

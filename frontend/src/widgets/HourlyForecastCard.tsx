import { useTranslation } from 'react-i18next'
import { Droplet } from 'lucide-react'
import { formatMeasurement, type WeatherUnit } from '@/entities/preferences'
import { conditionLabelKey } from '@/entities/weather'
import type { ForecastHour } from '@/features/weather'
import { formatWholePercent } from '@/shared/lib/numberFormat'
import { CONDITION_ICONS, conditionBadgeTone } from './conditionPresentation'

export interface HourlyForecastCardProps {
  hour: ForecastHour
  unit: WeatherUnit
  locale: string
}

export function HourlyForecastCard({
  hour,
  unit,
  locale,
}: HourlyForecastCardProps) {
  const { t } = useTranslation('home')

  const Icon = CONDITION_ICONS[hour.condition]
  const tone = conditionBadgeTone(hour.condition)
  const temperature = formatMeasurement(
    hour.temperature ?? undefined,
    unit,
    locale,
  )

  return (
    <li className="relative flex w-forecast-card shrink-0 flex-col gap-1 rounded-2xl border border-border bg-surface-raised p-3 text-caption">
      <p className="font-medium tabular-nums text-text">
        <span className="sr-only">{t('weather.hourLabel')}: </span>
        {hour.isCurrentHour ? t('weather.now') : hour.hourLabel}
      </p>

      <p className="tabular-nums text-text">
        <span className="sr-only">{t('weather.temperatureLabel')}: </span>
        {temperature ?? t('weather.unavailableValue')}
      </p>

      <p className="flex items-start gap-1">
        <Icon
          aria-hidden="true"
          className={`mt-0.5 h-4 w-4 shrink-0 ${tone}`}
        />
        <span className={`break-words ${tone}`}>
          <span className="sr-only">{t('weather.conditionLabel')}: </span>
          {t(`weather.conditions.${conditionLabelKey(hour.condition)}`)}
        </span>
      </p>

      <p className="flex items-center gap-1 text-text-muted">
        <Droplet aria-hidden="true" className="h-4 w-4 shrink-0" />
        <span aria-hidden="true" className="tabular-nums whitespace-nowrap">
          {hour.precipitationProbability === null
            ? t('weather.precipitationProbabilityUnavailableShort')
            : formatWholePercent(hour.precipitationProbability, locale)}
        </span>
        <span className="sr-only">
          {hour.precipitationProbability === null
            ? t('weather.precipitationProbabilityUnavailable')
            : t('weather.precipitationProbability', {
                value: formatWholePercent(
                  hour.precipitationProbability,
                  locale,
                ),
              })}
        </span>
      </p>
    </li>
  )
}

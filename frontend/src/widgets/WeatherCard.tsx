import { useTranslation } from 'react-i18next'
import {
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  MapPin,
  Sun,
} from 'lucide-react'
import {
  formatMeasurement,
  type WeatherMeasurement,
  type WeatherUnit,
} from '@/entities/preferences'
import { Link } from '@/shared/ui/Link'
import { Button } from '@/shared/ui/Button'
import { Skeleton } from '@/shared/ui/Skeleton'

export type WeatherCondition =
  'clear' | 'partly-cloudy' | 'cloudy' | 'rain' | 'snow' | 'storm' | 'fog'

export interface WeatherView {
  locationLabel: string
  temperature: WeatherMeasurement
  condition: WeatherCondition
  high?: WeatherMeasurement
  low?: WeatherMeasurement
  precipitation?: WeatherMeasurement
  wind?: WeatherMeasurement
  updatedAt?: string
}

export type WeatherCardState =
  | { status: 'no-location' }
  | { status: 'loading' }
  | { status: 'ready'; data: WeatherView }
  | { status: 'stale'; data: WeatherView }
  | { status: 'unavailable' }
  | { status: 'error' }

export interface WeatherCardProps {
  state: WeatherCardState
  unit: WeatherUnit
  locale: string
  onRetry?: () => void
}

const CONDITION_KEYS: Record<WeatherCondition, string> = {
  clear: 'clear',
  'partly-cloudy': 'partlyCloudy',
  cloudy: 'cloudy',
  rain: 'rain',
  snow: 'snow',
  storm: 'storm',
  fog: 'fog',
}

const CONDITION_ICONS: Record<WeatherCondition, typeof Sun> = {
  clear: Sun,
  'partly-cloudy': CloudSun,
  cloudy: Cloud,
  rain: CloudRain,
  snow: CloudSnow,
  storm: CloudLightning,
  fog: CloudFog,
}

function badgeTone(condition: WeatherCondition): string {
  switch (condition) {
    case 'clear':
    case 'partly-cloudy':
      return 'border-warm/50 text-warm'
    case 'rain':
    case 'snow':
    case 'storm':
    case 'fog':
      return 'border-cool/50 text-cool'
    default:
      return 'border-border-strong text-text-muted'
  }
}

function formatUpdatedAt(value: string, locale: string): string | null {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  try {
    return new Intl.DateTimeFormat(locale, { timeStyle: 'short' }).format(date)
  } catch {
    return null
  }
}

export function WeatherCard({
  state,
  unit,
  locale,
  onRetry,
}: WeatherCardProps) {
  const { t } = useTranslation('home')

  const heading = (
    <h2 id="weather-heading" className="text-title font-semibold text-text">
      {t('weather.heading')}
    </h2>
  )

  if (state.status === 'loading') {
    return (
      <section
        aria-labelledby="weather-heading"
        aria-busy="true"
        className="space-y-3 rounded-2xl border border-border bg-surface p-5"
      >
        {heading}
        <p className="sr-only">{t('weather.loading')}</p>
        <Skeleton lines={1} className="max-w-xs" />
        <Skeleton lines={2} />
      </section>
    )
  }

  if (state.status === 'no-location') {
    return (
      <section
        aria-labelledby="weather-heading"
        className="space-y-2 rounded-2xl border border-border bg-surface p-5"
      >
        {heading}
        <p className="text-body font-medium text-text">
          {t('weather.noLocationHeading')}
        </p>
        <p className="text-caption text-text-muted">
          {t('weather.noLocationDescription')}
        </p>
        <p className="pt-1">
          <Link to="/settings#weather-location">
            {t('weather.noLocationAction')}
          </Link>
        </p>
      </section>
    )
  }

  if (state.status === 'unavailable') {
    return (
      <section
        aria-labelledby="weather-heading"
        className="space-y-2 rounded-2xl border border-border bg-surface p-5"
      >
        {heading}
        <p className="text-body text-text-muted">{t('weather.unavailable')}</p>
      </section>
    )
  }

  if (state.status === 'error') {
    return (
      <section
        aria-labelledby="weather-heading"
        className="space-y-2 rounded-2xl border border-danger bg-surface p-5"
      >
        {heading}
        <p className="text-body text-text-muted">{t('weather.error')}</p>
        {onRetry ? (
          <Button variant="secondary" onClick={onRetry}>
            {t('weather.retry')}
          </Button>
        ) : null}
      </section>
    )
  }

  const { data } = state
  const Icon = CONDITION_ICONS[data.condition]
  const temperature = formatMeasurement(data.temperature, unit, locale)
  const high = formatMeasurement(data.high, unit, locale)
  const low = formatMeasurement(data.low, unit, locale)
  const precipitation = formatMeasurement(data.precipitation, unit, locale)
  const wind = formatMeasurement(data.wind, unit, locale)
  const updatedAt = data.updatedAt
    ? formatUpdatedAt(data.updatedAt, locale)
    : null

  return (
    <section
      aria-labelledby="weather-heading"
      className="space-y-3 rounded-2xl border border-border bg-surface p-5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        {heading}
        <p className="inline-flex min-w-0 items-center gap-1 text-caption text-text-muted">
          <MapPin aria-hidden="true" className="h-4 w-4 shrink-0" />
          <span className="break-words">{data.locationLabel}</span>
        </p>
      </div>

      {state.status === 'stale' ? (
        <p className="text-caption font-medium text-warning">
          {t('weather.stale')}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Icon aria-hidden="true" className="h-8 w-8 text-primary" />
        {temperature ? (
          <p className="text-display font-bold tabular-nums text-text">
            {temperature}
          </p>
        ) : null}
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-caption ${badgeTone(
            data.condition,
          )}`}
        >
          {t(`weather.conditions.${CONDITION_KEYS[data.condition]}`)}
        </span>
      </div>

      <dl className="flex flex-wrap gap-x-4 gap-y-1 text-caption text-text-muted">
        {high ? (
          <div className="flex gap-1">
            <dt>{t('weather.high')}</dt>
            <dd className="tabular-nums">{high}</dd>
          </div>
        ) : null}
        {low ? (
          <div className="flex gap-1">
            <dt>{t('weather.low')}</dt>
            <dd className="tabular-nums">{low}</dd>
          </div>
        ) : null}
        {precipitation ? (
          <div className="flex gap-1">
            <dt>{t('weather.precipitation')}</dt>
            <dd className="tabular-nums">{precipitation}</dd>
          </div>
        ) : null}
        {wind ? (
          <div className="flex gap-1">
            <dt>{t('weather.wind')}</dt>
            <dd className="tabular-nums">{wind}</dd>
          </div>
        ) : null}
      </dl>

      {updatedAt ? (
        <p className="text-caption tabular-nums text-text-muted">
          {t('weather.updated', { time: updatedAt })}
        </p>
      ) : null}
    </section>
  )
}

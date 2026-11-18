import { useTranslation } from 'react-i18next'
import { MapPin } from 'lucide-react'
import { formatMeasurement, type WeatherUnit } from '@/entities/preferences'
import {
  conditionLabelKey,
  temperatureMeasurement,
  precipitationMeasurement,
  windSpeedMeasurement,
} from '@/entities/weather'
import type { WeatherCardState } from '@/features/weather'
import { formatWholePercent } from '@/shared/lib/numberFormat'
import { Link } from '@/shared/ui/Link'
import { Button } from '@/shared/ui/Button'
import { CONDITION_ICONS, conditionBadgeTone } from './conditionPresentation'
import { WeatherForecastList } from './WeatherForecastList'

export type { WeatherCardState } from '@/features/weather'

export interface WeatherCardProps {
  state: WeatherCardState
  unit: WeatherUnit
  locale: string
  announcement?: string | null
  onRefresh?: () => void
  onRetry?: () => void
}

function formatTime(date: Date, locale: string): string | null {
  if (Number.isNaN(date.getTime())) return null
  try {
    return new Intl.DateTimeFormat(locale, { timeStyle: 'short' }).format(date)
  } catch {
    return null
  }
}

function formatAge(milliseconds: number, locale: string): string | null {
  const minutes = Math.max(1, Math.round(milliseconds / 60_000))
  try {
    const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
    if (minutes < 60) return formatter.format(-minutes, 'minute')
    return formatter.format(-Math.round(minutes / 60), 'hour')
  } catch {
    return null
  }
}

export function WeatherCard({
  state,
  unit,
  locale,
  announcement = null,
  onRefresh,
  onRetry,
}: WeatherCardProps) {
  const { t } = useTranslation('home')

  const heading = (
    <h2 id="weather-heading" className="text-title font-semibold text-text">
      {t('weather.heading')}
    </h2>
  )

  const liveRegion = (
    <p role="status" aria-live="polite" className="sr-only">
      {announcement ?? ''}
    </p>
  )

  if (state.status === 'loading') {
    return (
      <section
        aria-labelledby="weather-heading"
        aria-busy="true"
        className="space-y-3 rounded-2xl border border-border bg-surface p-5"
      >
        {heading}
        {liveRegion}
        <p className="sr-only">{t('weather.loading')}</p>
        <div aria-hidden="true" className="flex gap-2 overflow-hidden">
          {Array.from({ length: 4 }, (_, index) => (
            <div
              key={index}
              className="h-24 w-forecast-card shrink-0 animate-pulse rounded-2xl bg-surface-subtle"
            />
          ))}
        </div>
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
        {liveRegion}
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

  if (state.status === 'invalid-location') {
    return (
      <section
        aria-labelledby="weather-heading"
        className="space-y-2 rounded-2xl border border-border bg-surface p-5"
      >
        {heading}
        {liveRegion}
        <p className="text-body font-medium text-text">
          {t('weather.invalidLocationHeading')}
        </p>
        <p className="text-caption text-text-muted">
          {t('weather.invalidLocationDescription')}
        </p>
        <p className="pt-1">
          <Link to="/settings#weather-location">
            {t('weather.invalidLocationAction')}
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
        {liveRegion}
        <p className="text-body text-text-muted">
          {state.coverage
            ? t('weather.coverageUnavailable')
            : t('weather.unavailable')}
        </p>
        {onRetry ? (
          <Button variant="secondary" onClick={onRetry}>
            {t('weather.retry')}
          </Button>
        ) : null}
      </section>
    )
  }

  const current = state.current
  const temperature = formatMeasurement(
    temperatureMeasurement(current?.temperatureCelsius ?? null) ?? undefined,
    unit,
    locale,
  )
  const apparent = formatMeasurement(
    temperatureMeasurement(current?.apparentTemperatureCelsius ?? null) ??
      undefined,
    unit,
    locale,
  )
  const wind = formatMeasurement(
    windSpeedMeasurement(current?.windSpeedKilometersPerHour ?? null) ??
      undefined,
    unit,
    locale,
  )
  const precipitation = formatMeasurement(
    precipitationMeasurement(current?.precipitationMillimeters ?? null) ??
      undefined,
    unit,
    locale,
  )
  const updatedAt = formatTime(state.freshness.lastRetrievedAt, locale)
  const observationAge =
    state.freshness.isMaterialObservationAge &&
    state.freshness.observationAgeMs !== null
      ? formatAge(state.freshness.observationAgeMs, locale)
      : null
  const Icon = CONDITION_ICONS[current?.condition ?? 'unknown']
  const headingKey = state.freshness.isOutdated
    ? 'weather.lastKnownHeading'
    : 'weather.currentHeading'
  const groupLabel = state.freshness.isOutdated
    ? t('weather.lastKnownLabel')
    : t('weather.currentLabel')

  return (
    <section
      aria-labelledby="weather-heading"
      aria-busy={state.isRefreshing ? 'true' : undefined}
      className="space-y-3 rounded-2xl border border-border bg-surface p-5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        {heading}
        <p className="inline-flex min-w-0 items-center gap-1 text-caption text-text-muted">
          <MapPin aria-hidden="true" className="h-4 w-4 shrink-0" />
          <span className="break-words">{state.locationLabel}</span>
        </p>
      </div>

      {liveRegion}

      {state.freshness.isOutdated ? (
        <p className="text-caption font-medium text-warning">
          {t('weather.outdatedDescription')}
        </p>
      ) : null}

      <div role="group" aria-label={groupLabel} className="space-y-2">
        <h3 className="text-body font-semibold text-text">{t(headingKey)}</h3>
        {current ? (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <Icon aria-hidden="true" className="h-8 w-8 text-primary" />
              {temperature ? (
                <p className="text-display font-bold tabular-nums text-text">
                  {temperature}
                </p>
              ) : (
                <p className="text-body font-medium text-text-muted">
                  {t('weather.unavailableValue')}
                </p>
              )}
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-caption ${conditionBadgeTone(
                  current.condition,
                )}`}
              >
                {t(
                  `weather.conditions.${conditionLabelKey(current.condition)}`,
                )}
              </span>
            </div>

            <dl className="flex flex-wrap gap-x-4 gap-y-1 text-caption text-text-muted">
              {apparent ? (
                <div className="flex gap-1">
                  <dt>{t('weather.feelsLike')}</dt>
                  <dd className="tabular-nums">{apparent}</dd>
                </div>
              ) : null}
              {wind ? (
                <div className="flex gap-1">
                  <dt>{t('weather.wind')}</dt>
                  <dd className="tabular-nums">{wind}</dd>
                </div>
              ) : null}
              {current.relativeHumidityPercent !== null ? (
                <div className="flex gap-1">
                  <dt>{t('weather.humidity')}</dt>
                  <dd className="tabular-nums">
                    {formatWholePercent(
                      current.relativeHumidityPercent,
                      locale,
                    )}
                  </dd>
                </div>
              ) : null}
              {precipitation ? (
                <div className="flex gap-1">
                  <dt>{t('weather.precipitation')}</dt>
                  <dd className="tabular-nums">{precipitation}</dd>
                </div>
              ) : null}
            </dl>
          </>
        ) : (
          <p className="text-body text-text-muted">
            {t('weather.unavailableValue')}
          </p>
        )}
      </div>

      {updatedAt ? (
        <p className="text-caption tabular-nums text-text-muted">
          {t('weather.updated', { time: updatedAt })}
        </p>
      ) : null}

      {observationAge ? (
        <p className="text-caption tabular-nums text-text-muted">
          {t('weather.observationAge', { age: observationAge })}
        </p>
      ) : null}

      <WeatherForecastList hours={state.hours} unit={unit} locale={locale} />

      {state.coverage === 'partial' ? (
        <p className="text-caption text-text-muted">
          {t('weather.coveragePartial')}
        </p>
      ) : null}
      {state.coverage === 'unavailable' ? (
        <p className="text-caption text-text-muted">
          {t('weather.coverageUnavailableForecast')}
        </p>
      ) : null}

      <p className="text-caption text-text-muted">
        {t('weather.attribution')}{' '}
        <a
          href="https://open-meteo.com/"
          target="_blank"
          rel="noreferrer noopener"
          className="rounded-control text-primary underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          {t('weather.attributionLink')}
        </a>
      </p>

      {onRefresh ? (
        <Button
          variant="secondary"
          onClick={onRefresh}
          disabled={state.isRefreshing}
        >
          {state.isRefreshing ? t('weather.refreshing') : t('weather.refresh')}
        </Button>
      ) : null}
    </section>
  )
}

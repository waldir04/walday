import { useRef } from 'react'
import type { KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import type { WeatherUnit } from '@/entities/preferences'
import type { ForecastHour } from '@/features/weather'
import { useHorizontalOverflow } from '@/shared/lib/useHorizontalOverflow'
import { usePrefersReducedMotion } from '@/shared/lib/usePrefersReducedMotion'
import { HourlyForecastCard } from './HourlyForecastCard'

export interface WeatherForecastListProps {
  hours: readonly ForecastHour[]
  unit: WeatherUnit
  locale: string
}

/** Used when layout metrics are unavailable (for example in jsdom). */
const FALLBACK_SCROLL_STEP_PX = 96
/** Matches the row's `gap-2` when computed styles are unavailable. */
const FALLBACK_GAP_PX = 8

function measureScrollStep(list: HTMLOListElement): number {
  const firstCard = list.querySelector<HTMLElement>('li')
  const cardWidth = firstCard?.offsetWidth ?? 0
  if (!firstCard || cardWidth <= 0) return FALLBACK_SCROLL_STEP_PX

  const styles = window.getComputedStyle(list)
  const parsedGap = Number.parseFloat(styles.columnGap || styles.gap)
  const gap = Number.isFinite(parsedGap) ? parsedGap : FALLBACK_GAP_PX
  return cardWidth + gap
}

export function WeatherForecastList({
  hours,
  unit,
  locale,
}: WeatherForecastListProps) {
  const { t } = useTranslation('home')
  const rowRef = useRef<HTMLOListElement>(null)
  const isOverflowing = useHorizontalOverflow(
    rowRef,
    hours.length,
    locale,
    unit,
  )
  const prefersReducedMotion = usePrefersReducedMotion()
  const scrollBehavior = prefersReducedMotion ? 'auto' : 'smooth'

  if (hours.length === 0) return null

  const handleKeyDown = (event: KeyboardEvent<HTMLOListElement>) => {
    const list = event.currentTarget
    switch (event.key) {
      case 'ArrowRight':
        event.preventDefault()
        list.scrollBy({
          left: measureScrollStep(list),
          behavior: scrollBehavior,
        })
        break
      case 'ArrowLeft':
        event.preventDefault()
        list.scrollBy({
          left: -measureScrollStep(list),
          behavior: scrollBehavior,
        })
        break
      case 'Home':
        event.preventDefault()
        list.scrollTo({ left: 0, behavior: scrollBehavior })
        break
      case 'End':
        event.preventDefault()
        list.scrollTo({ left: list.scrollWidth, behavior: scrollBehavior })
        break
      default:
        break
    }
  }

  const hintId = 'hourly-forecast-hint'

  return (
    <section aria-labelledby="hourly-forecast-heading" className="space-y-2">
      <h3
        id="hourly-forecast-heading"
        className="text-body font-semibold text-text"
      >
        {t('weather.forecastHeading')}
      </h3>

      {isOverflowing ? (
        <p id={hintId} className="text-caption text-text-muted">
          {t('weather.forecastScrollHint')}
        </p>
      ) : null}

      <ol
        ref={rowRef}
        tabIndex={0}
        aria-labelledby="hourly-forecast-heading"
        aria-describedby={isOverflowing ? hintId : undefined}
        onKeyDown={handleKeyDown}
        className="flex min-w-0 max-w-full items-stretch gap-2 overflow-x-auto overscroll-x-contain rounded-control outline-none ring-focus ring-offset-2 ring-offset-surface focus-visible:ring-2"
      >
        {hours.map((hour) => (
          <HourlyForecastCard
            key={hour.timeMs}
            hour={hour}
            unit={unit}
            locale={locale}
          />
        ))}
      </ol>
    </section>
  )
}

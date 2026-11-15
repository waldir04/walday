import { useTranslation } from 'react-i18next'
import { minutesToTimeLabel, formatMinuteDuration } from '../model/timeOfDay'
import type { AvailablePeriod, AvailabilityResult } from '../model/types'

export interface AvailablePeriodRowProps {
  period: AvailablePeriod
  locale: string
}

function AvailablePeriodRow({ period, locale }: AvailablePeriodRowProps) {
  const { t } = useTranslation('agenda')
  const endOfDay = t('entry.endOfDay')
  const start = minutesToTimeLabel(period.startMinutes, locale, endOfDay)
  const end = minutesToTimeLabel(period.endMinutes, locale, endOfDay)

  return (
    <li
      aria-label={t('availability.ariaPeriod', { start, end })}
      className="text-body text-text"
    >
      <span className="tabular-nums">
        {t('availability.period', { start, end })}
      </span>
    </li>
  )
}

export interface AgendaAvailabilityProps {
  availability: AvailabilityResult
  locale: string
  isToday: boolean
  dateLabel: string
}

export function AgendaAvailability({
  availability,
  locale,
  isToday,
  dateLabel,
}: AgendaAvailabilityProps) {
  const { t } = useTranslation('agenda')

  let content
  if (availability.kind === 'none') {
    content = (
      <p className="text-body text-text-muted">
        {availability.reason === 'past-date'
          ? t('availability.pastDate')
          : t('availability.incomplete')}
      </p>
    )
  } else if (availability.periods.length === 0) {
    content = (
      <>
        <p className="text-body text-text-muted">
          {isToday ? t('availability.noneToday') : t('availability.noneFuture')}
        </p>
        <p className="mt-1 text-caption text-text-muted">
          {t('availability.total', {
            duration: formatMinuteDuration(0, locale),
          })}
        </p>
      </>
    )
  } else {
    content = (
      <>
        <ul className="space-y-1">
          {availability.periods.map((period) => (
            <AvailablePeriodRow
              key={`${period.startMinutes}-${period.endMinutes}`}
              period={period}
              locale={locale}
            />
          ))}
        </ul>
        <p className="mt-2 text-caption text-text-muted">
          {t('availability.total', {
            duration: formatMinuteDuration(availability.totalMinutes, locale),
          })}
        </p>
      </>
    )
  }

  return (
    <section
      aria-labelledby="agenda-availability-heading"
      className="space-y-2"
    >
      <h2
        id="agenda-availability-heading"
        className="text-title font-semibold text-text"
      >
        {t('headings.availability', { date: dateLabel })}
      </h2>
      {content}
    </section>
  )
}

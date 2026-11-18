import { useTranslation } from 'react-i18next'
import { formatDuration } from '@/entities/task'
import type { TFunction } from 'i18next'
import type { WeatherUnit } from '@/entities/preferences'
import { conditionLabelKey, type Conditions } from '@/entities/weather'
import { formatLocalDate, formatLocalTime } from '@/shared/lib/localDateTime'
import { formatWholePercent } from '@/shared/lib/numberFormat'
import { SuggestionActions } from './SuggestionActions'
import type {
  SuggestionReason,
  SuggestionView,
  WeatherEvidence,
} from '../model/types'

export interface SuggestionCardProps {
  suggestion: SuggestionView
  locale: string
  dateStyle: Intl.DateTimeFormatOptions['dateStyle']
  weatherUnit: WeatherUnit
  pending: boolean
  onAccept: () => void
  onAdjust: () => void
  onDismiss: () => void
}

const DAY_END_MINUTES = 1440

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function timeLabel(minutes: number, locale: string, endOfDay: string): string {
  if (minutes >= DAY_END_MINUTES) return endOfDay
  const safe = Math.max(0, Math.floor(minutes))
  return formatLocalTime(
    `${pad(Math.floor(safe / 60))}:${pad(safe % 60)}`,
    locale,
  )
}

export function SuggestionCard({
  suggestion,
  locale,
  dateStyle,
  pending,
  onAccept,
  onAdjust,
  onDismiss,
}: SuggestionCardProps) {
  const { t } = useTranslation('suggestions')
  const endOfDay = t('time.endOfDay')
  const headingId = `suggestion-heading-${suggestion.id}`
  const reasonId = `suggestion-reason-${suggestion.id}`

  const heading =
    suggestion.category === 'slot'
      ? t('card.scheduleHeading', { title: suggestion.targetTitle })
      : suggestion.category === 'flexible-adjustment'
        ? t('card.adjustCommitmentHeading', {
            title: suggestion.targetTitle,
          })
        : t('card.moveHeading', { title: suggestion.targetTitle })

  const reasonTexts = suggestion.reasons
    .map((reason) =>
      reasonToText(reason, {
        locale,
        dateStyle,
        t,
        endOfDay,
      }),
    )
    .filter((text) => text.length > 0)

  const weatherText = suggestion.weatherEvidence
    ? weatherEvidenceText(suggestion.weatherEvidence, {
        locale,
        t,
        endOfDay,
      })
    : null

  return (
    <li
      aria-labelledby={headingId}
      aria-describedby={reasonId}
      className="space-y-3 rounded-2xl border border-suggestion-surface-strong bg-suggestion-surface-strong/40 p-4"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center rounded-full border border-tag-border px-3 py-1 text-caption font-medium text-tag-text">
          {t(`categories.${categoryKey(suggestion.category)}`)}
        </span>
      </div>

      <h3
        id={headingId}
        className="text-body font-semibold text-suggestion-text"
      >
        {heading}
      </h3>

      {suggestion.currentLabel ? (
        <p className="text-caption text-suggestion-text tabular-nums">
          {t('card.current', { time: suggestion.currentLabel })}
        </p>
      ) : (
        <p className="text-caption text-suggestion-text">
          {t('card.unscheduled')}
        </p>
      )}
      <p className="text-body font-medium text-suggestion-text tabular-nums">
        {t('card.proposed', { time: suggestion.proposedLabel })}
      </p>
      {suggestion.durationLabel ? (
        <p className="text-caption text-suggestion-text">
          {t('card.duration', { duration: suggestion.durationLabel })}
        </p>
      ) : null}

      <p id={reasonId} className="space-y-1 text-caption text-suggestion-text">
        <span className="font-medium">{t('card.reasonLabel')}: </span>
        {reasonTexts.join(' ')}
      </p>

      {weatherText ? (
        <p className="text-caption text-suggestion-text">{weatherText}</p>
      ) : null}

      <SuggestionActions
        suggestion={suggestion}
        pending={pending}
        onAccept={onAccept}
        onAdjust={onAdjust}
        onDismiss={onDismiss}
      />
    </li>
  )
}

function categoryKey(
  category: SuggestionView['category'],
): 'conflict' | 'slot' | 'flexible' {
  if (category === 'flexible-adjustment') return 'flexible'
  return category
}

function reasonToText(
  reason: SuggestionReason,
  context: {
    locale: string
    dateStyle: Intl.DateTimeFormatOptions['dateStyle']
    t: TFunction<'suggestions'>
    endOfDay: string
  },
): string {
  const { locale, dateStyle, t, endOfDay } = context
  const time = (minutes: number): string => timeLabel(minutes, locale, endOfDay)

  switch (reason.kind) {
    case 'conflict': {
      const base = t('reasons.conflict.text', {
        titles: reason.conflictingTitles.join(', '),
        start: time(reason.overlapStartMinutes),
        end: time(reason.overlapEndMinutes),
      })
      const protectedText = reason.fixedProtected
        ? t('reasons.conflict.fixedProtected')
        : ''
      const remaining = reason.remainingOverlaps
        .map((overlap) =>
          t('reasons.conflict.remainingOverlaps', {
            titles: overlap.titles.join(', '),
            start: time(overlap.overlapStartMinutes),
            end: time(overlap.overlapEndMinutes),
          }),
        )
        .join('')
      return `${base}${protectedText}${remaining}`
    }
    case 'due-date': {
      const key =
        reason.urgency === 'overdue'
          ? 'reasons.dueDate.overdue'
          : reason.urgency === 'due-today'
            ? 'reasons.dueDate.dueToday'
            : 'reasons.dueDate.future'
      return t(key, {
        date: formatLocalDate(reason.dueDate, locale, dateStyle),
      })
    }
    case 'priority':
      return t(`reasons.priority.${reason.priority}`)
    case 'fit':
      return t('reasons.fit.text', {
        start: time(reason.periodStartMinutes),
        end: time(reason.periodEndMinutes),
        duration: formatDuration(reason.durationMinutes, locale),
      })
    case 'beneficiary':
      return t('reasons.beneficiary.text', { title: reason.taskTitle })
    case 'weather':
      return t('reasons.weather.text', {
        condition: conditionText(reason.condition, t),
        start: time(reason.spanStartMinutes),
        end: time(reason.spanEndMinutes),
      })
    case 'protected-fixed':
      return t('reasons.protectedFixed.text', {
        titles: reason.titles.join(', '),
      })
    case 'no-duration':
      return ''
  }
}

function conditionText(
  condition: Conditions,
  t: TFunction<'suggestions'>,
): string {
  return t(`weather.conditions.${conditionLabelKey(condition)}`)
}

function weatherEvidenceText(
  evidence: WeatherEvidence,
  context: {
    locale: string
    t: TFunction<'suggestions'>
    endOfDay: string
  },
): string {
  const { locale, t, endOfDay } = context
  const precipitation =
    evidence.chosenPrecipitationProbability === null
      ? t('weather.conditions.unknown')
      : formatWholePercent(evidence.chosenPrecipitationProbability, locale)
  return t('weather.influencedBy', {
    condition: conditionText(evidence.chosenCondition, t),
    precipitation,
    start: timeLabel(evidence.chosenStartMinutes, locale, endOfDay),
    end: timeLabel(evidence.chosenEndMinutes, locale, endOfDay),
  })
}

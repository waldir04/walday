import { useTranslation } from 'react-i18next'
import { AgendaEntryRow } from './AgendaEntryRow'
import type { AgendaEntry, AgendaSchedulingState } from '../model/types'

export interface AgendaTimelineProps {
  entries: AgendaEntry[]
  locale: string
  dateLabel: string
  empty: boolean
  pending: boolean
  scheduling: AgendaSchedulingState
  onSchedule: (_taskId: string) => void
  onAdjust: (_taskId: string) => void
  onUnschedule: (_taskId: string) => void
}

export function AgendaTimeline({
  entries,
  locale,
  dateLabel,
  empty,
  pending,
  scheduling,
  onSchedule,
  onAdjust,
  onUnschedule,
}: AgendaTimelineProps) {
  const { t } = useTranslation('agenda')

  return (
    <section aria-labelledby="agenda-timeline-heading" className="space-y-3">
      <h2
        id="agenda-timeline-heading"
        className="text-title font-semibold text-text"
      >
        {t('headings.timeline', { date: dateLabel })}
      </h2>

      <p className="text-caption text-text-muted">{t('orderingHint')}</p>

      {empty ? (
        <div className="rounded-2xl border border-border bg-surface p-5">
          <p className="text-body font-semibold text-text">
            {t('emptyTimeline.heading')}
          </p>
          <p className="mt-1 text-caption text-text-muted">
            {t('emptyTimeline.description', { date: dateLabel })}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {entries.map((entry) => (
            <AgendaEntryRow
              key={entry.key}
              entry={entry}
              locale={locale}
              pending={pending}
              scheduling={scheduling}
              onSchedule={() => onSchedule(entry.sourceId)}
              onAdjust={() => onAdjust(entry.sourceId)}
              onUnschedule={() => onUnschedule(entry.sourceId)}
            />
          ))}
        </ul>
      )}
    </section>
  )
}

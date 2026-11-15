import { useTranslation } from 'react-i18next'
import { minutesToTimeLabel } from '../model/timeOfDay'
import type { AgendaEntry, TimeConflict } from '../model/types'

export interface AgendaConflictSummaryProps {
  conflicts: TimeConflict[]
  entries: AgendaEntry[]
  locale: string
  dateLabel: string
}

export function AgendaConflictSummary({
  conflicts,
  entries,
  locale,
  dateLabel,
}: AgendaConflictSummaryProps) {
  const { t } = useTranslation('agenda')
  if (conflicts.length === 0) return null

  const endOfDay = t('entry.endOfDay')
  const byKey = new Map(entries.map((entry) => [entry.key, entry]))
  const involved = new Set(conflicts.flatMap((conflict) => conflict.entryKeys))

  return (
    <section aria-labelledby="agenda-conflicts-heading" className="space-y-2">
      <h2
        id="agenda-conflicts-heading"
        className="text-title font-semibold text-text"
      >
        {t('headings.conflicts', { date: dateLabel })}
      </h2>
      <ul className="space-y-2">
        {conflicts.map((conflict, index) => {
          const members = conflict.entryKeys
            .map((key) => byKey.get(key))
            .filter((entry): entry is AgendaEntry => entry !== undefined)
          const titles = members
            .map((entry) =>
              t('conflicts.entry', {
                title: entry.title,
                start: minutesToTimeLabel(entry.startMinutes, locale, endOfDay),
                end: minutesToTimeLabel(entry.endMinutes, locale, endOfDay),
              }),
            )
            .join(', ')

          return (
            <li key={conflict.id} className="text-caption text-warning">
              {t('conflicts.group', {
                index: index + 1,
                count: conflict.activityCount,
                titles,
              })}
            </li>
          )
        })}
      </ul>
      <p className="text-caption text-text-muted">
        {t('conflicts.total', {
          conflicts: conflicts.length,
          activities: involved.size,
        })}
      </p>
      {conflicts.some((conflict) => conflict.adjustableKeys.length > 0) ? (
        <ul className="space-y-1 text-caption text-text-muted">
          {conflicts.flatMap((conflict) =>
            conflict.adjustableKeys.map((key) => {
              const entry = byKey.get(key)
              if (!entry) return null
              return (
                <li key={`${conflict.id}:${key}`}>
                  {t('conflicts.adjustable', { title: entry.title })}
                </li>
              )
            }),
          )}
        </ul>
      ) : null}
    </section>
  )
}

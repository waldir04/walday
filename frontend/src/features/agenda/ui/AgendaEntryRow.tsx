import { useTranslation } from 'react-i18next'
import { RowActions, type RowActionView } from '@/shared/ui/RowActions'
import { Button } from '@/shared/ui/Button'
import { Link } from '@/shared/ui/Link'
import { minutesToTimeLabel } from '../model/timeOfDay'
import type { AgendaEntry, AgendaSchedulingState } from '../model/types'

export interface AgendaEntryRowProps {
  entry: AgendaEntry
  locale: string
  pending: boolean
  scheduling: AgendaSchedulingState
  onSchedule: () => void
  onAdjust: () => void
  onUnschedule: () => void
}

export function AgendaEntryRow({
  entry,
  locale,
  pending,
  scheduling,
  onSchedule,
  onAdjust,
  onUnschedule,
}: AgendaEntryRowProps) {
  const { t } = useTranslation('agenda')
  void onSchedule
  const endOfDay = t('entry.endOfDay')
  const startLabel = minutesToTimeLabel(entry.startMinutes, locale, endOfDay)
  const endLabel = minutesToTimeLabel(entry.endMinutes, locale, endOfDay)
  const category = t(`categories.${entry.category}`)
  const statusLabel =
    entry.category === 'task'
      ? entry.status === 'completed'
        ? t('entry.completed')
        : t('entry.pending')
      : null

  const conflictTexts = entry.conflicts.map((conflict) =>
    t('entry.conflict', {
      title: conflict.title,
      start: minutesToTimeLabel(conflict.overlapStartMinutes, locale, endOfDay),
      end: minutesToTimeLabel(conflict.overlapEndMinutes, locale, endOfDay),
    }),
  )

  const baseName =
    entry.category === 'task'
      ? t('entry.ariaTask', {
          category,
          title: entry.title,
          start: startLabel,
          end: endLabel,
          status: statusLabel,
        })
      : t('entry.ariaCommitment', {
          category,
          title: entry.title,
          start: startLabel,
          end: endLabel,
        })

  const withConflicts =
    conflictTexts.length > 0
      ? t('entry.ariaConflicts', {
          base: baseName,
          conflicts: conflictTexts.join('; '),
        })
      : baseName

  const accessibleName = entry.exceedsDayEnd
    ? t('entry.ariaOversize', { base: withConflicts })
    : withConflicts

  const actions: RowActionView[] =
    entry.category === 'task' && entry.status === 'pending'
      ? [
          {
            id: 'adjust',
            label: `${t('actions.changeTime')}: ${entry.title}`,
            onSelect: onAdjust,
          },
          ...(entry.exceedsDayEnd
            ? [
                {
                  id: 'adjust-duration',
                  label: `${t('actions.adjustTime')}: ${entry.title}`,
                  onSelect: onAdjust,
                },
              ]
            : []),
          {
            id: 'unschedule',
            label: `${t('actions.removeSchedule')}: ${entry.title}`,
            onSelect: onUnschedule,
            tone: 'danger' as const,
          },
        ]
      : []

  const showActions = actions.length > 0
  const actionsDisabled = pending || !scheduling.enabled

  return (
    <li
      aria-label={accessibleName}
      className="group rounded-2xl border border-border bg-surface p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="break-words text-body font-semibold text-text">
            {entry.title}
          </h3>
          <p className="mt-1 text-caption tabular-nums text-text-muted">
            {t('entry.timeRange', { start: startLabel, end: endLabel })}
          </p>
        </div>
        <span className="inline-flex items-center rounded-full border border-tag-border px-2 py-0.5 text-caption text-tag-text">
          {category}
        </span>
      </div>

      <div className="mt-2 space-y-1 text-caption text-text-muted">
        {statusLabel ? <p>{statusLabel}</p> : null}
        {entry.category === 'task' ? (
          <p>{t(`form.priorityOptions.${entry.priority}`, { ns: 'tasks' })}</p>
        ) : null}
        {entry.exceedsDayEnd ? (
          <p className="font-medium text-warning">{t('entry.oversize')}</p>
        ) : null}
        {entry.conflicts.map((conflict) => (
          <p key={conflict.entryKey} className="font-medium text-warning">
            {t('entry.conflict', {
              title: conflict.title,
              start: minutesToTimeLabel(
                conflict.overlapStartMinutes,
                locale,
                endOfDay,
              ),
              end: minutesToTimeLabel(
                conflict.overlapEndMinutes,
                locale,
                endOfDay,
              ),
            })}
          </p>
        ))}
      </div>

      {showActions ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {actionsDisabled ? (
            <>
              {actions.map((action) => (
                <Button key={action.id} variant="secondary" disabled>
                  {action.id === 'unschedule'
                    ? t('actions.removeSchedule')
                    : action.id === 'adjust-duration'
                      ? t('actions.adjustTime')
                      : t('actions.changeTime')}
                </Button>
              ))}
              {!scheduling.enabled && scheduling.reasonKey ? (
                <p className="text-caption text-text-muted">
                  {t('scheduling.unavailable', {
                    reason: t(scheduling.reasonKey),
                  })}{' '}
                  <Link to="/tasks">{t('scheduling.tasksLink')}</Link>
                </p>
              ) : null}
            </>
          ) : (
            <RowActions
              menuLabel={t('actions.menuLabel', { title: entry.title })}
              actions={actions}
            />
          )}
        </div>
      ) : null}
    </li>
  )
}

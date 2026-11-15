import { useTranslation } from 'react-i18next'
import { formatLocalDate, type LocalDate } from '@/shared/lib/localDateTime'
import { DateNav } from '@/shared/ui/DateNav'

export interface AgendaDateNavProps {
  date: LocalDate
  today: LocalDate
  locale: string
  dateStyle: Intl.DateTimeFormatOptions['dateStyle']
  onChange: (_date: LocalDate) => void
}

export function AgendaDateNav({
  date,
  today,
  locale,
  dateStyle,
  onChange,
}: AgendaDateNavProps) {
  const { t } = useTranslation('agenda')
  const dateLabel = formatLocalDate(date, locale, dateStyle)

  return (
    <section
      aria-label={t('dateNav.sectionLabel')}
      data-today={date === today ? 'true' : undefined}
      className="space-y-2"
    >
      <DateNav
        date={date}
        onChange={onChange}
        labels={{
          label: t('dateNav.label'),
          previous: t('dateNav.previous'),
          next: t('dateNav.next'),
          today: t('dateNav.today'),
        }}
      />
      <p className="text-caption text-text-muted">
        {t('dateNav.selectedDate', { date: dateLabel })}
      </p>
    </section>
  )
}

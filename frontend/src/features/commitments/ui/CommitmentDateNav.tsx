import { useTranslation } from 'react-i18next'
import { getLocalToday } from '@/shared/lib/localDateTime'
import { Button } from '@/shared/ui/Button'

export interface CommitmentDateNavProps {
  date: string
  onChange: (_date: string) => void
}

function shiftDate(date: string, days: number): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  if (!match) return date
  const value = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]) + days,
  )
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function CommitmentDateNav({ date, onChange }: CommitmentDateNavProps) {
  const { t } = useTranslation('commitments')

  return (
    <section className="flex flex-wrap items-end gap-2">
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          onClick={() => onChange(shiftDate(date, -1))}
        >
          {t('commitments.dateNav.previous')}
        </Button>
        <Button
          variant="secondary"
          onClick={() => onChange(shiftDate(date, 1))}
        >
          {t('commitments.dateNav.next')}
        </Button>
        <Button variant="secondary" onClick={() => onChange(getLocalToday())}>
          {t('commitments.dateNav.today')}
        </Button>
      </div>
      <label className="flex flex-col gap-1 text-caption font-medium text-text">
        {t('commitments.dateNav.label')}
        <input
          type="date"
          value={date}
          onChange={(event) => onChange(event.target.value)}
          className="rounded-control border border-border bg-surface px-control py-2 text-body text-text"
        />
      </label>
    </section>
  )
}

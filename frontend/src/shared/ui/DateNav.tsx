import {
  getLocalToday,
  shiftLocalDate,
  type LocalDate,
} from '@/shared/lib/localDateTime'
import { Button } from './Button'

export interface DateNavLabels {
  label: string
  previous: string
  next: string
  today: string
}

export interface DateNavProps {
  date: LocalDate
  labels: DateNavLabels
  onChange: (_date: LocalDate) => void
}

/** Shared date navigation: previous, next, today, and a native date input. */
export function DateNav({ date, labels, onChange }: DateNavProps) {
  return (
    <section className="flex flex-wrap items-end gap-2">
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          onClick={() => onChange(shiftLocalDate(date, -1))}
        >
          {labels.previous}
        </Button>
        <Button
          variant="secondary"
          onClick={() => onChange(shiftLocalDate(date, 1))}
        >
          {labels.next}
        </Button>
        <Button variant="secondary" onClick={() => onChange(getLocalToday())}>
          {labels.today}
        </Button>
      </div>
      <label className="flex flex-col gap-1 text-caption font-medium text-text">
        {labels.label}
        <input
          type="date"
          value={date}
          onChange={(event) => {
            if (event.target.value.length > 0) onChange(event.target.value)
          }}
          className="min-h-11 rounded-control border border-border-strong bg-surface px-control py-2 text-body text-text"
        />
      </label>
    </section>
  )
}

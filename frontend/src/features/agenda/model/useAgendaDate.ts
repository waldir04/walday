import { useSearchParams } from 'react-router-dom'
import { AGENDA_DATE_PARAM } from '@/shared/config/agenda'
import {
  getLocalToday,
  isLocalDate,
  type LocalDate,
} from '@/shared/lib/localDateTime'

export interface AgendaDateController {
  date: LocalDate
  today: LocalDate
  selectDate: (_date: LocalDate) => void
}

/**
 * Read and write the selected agenda date in the `?date=YYYY-MM-DD` search
 * parameter. Missing or invalid values fall back to the current local date.
 */
export function useAgendaDate(): AgendaDateController {
  const [searchParams, setSearchParams] = useSearchParams()
  const today = getLocalToday()
  const raw = searchParams.get(AGENDA_DATE_PARAM)
  const date = raw && isLocalDate(raw) ? raw : today

  function selectDate(next: LocalDate): void {
    const params = new URLSearchParams(searchParams)
    params.set(AGENDA_DATE_PARAM, next)
    setSearchParams(params)
  }

  return { date, today, selectDate }
}

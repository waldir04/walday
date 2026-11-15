import type { AgendaCategory } from './types'

export { DAY_END_MINUTES, DAY_START_MINUTES } from '@/shared/config/agenda'
export { AVAILABLE_GAP_MINUTES } from '@/shared/config/agenda'

export const AGENDA_CATEGORIES = [
  'fixed-commitment',
  'flexible-commitment',
  'task',
] as const

export const AGENDA_CATEGORY_RANK: Readonly<Record<AgendaCategory, number>> = {
  'fixed-commitment': 0,
  'flexible-commitment': 1,
  task: 2,
}

export const AGENDA_ENTRY_KEY_SEPARATOR = ':'

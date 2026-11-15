// Narrow public entry for Home. Re-exports only the agenda derivation, types,
// and the date hook so composing Home does not pull agenda UI into the initial
// bundle.
export { buildAgendaDay } from './model/agendaDay'
export { useAgendaDate } from './model/useAgendaDate'
export type { AgendaDateController } from './model/useAgendaDate'
export { scheduleConflicts, validateScheduleDraft } from './model/scheduleDraft'
export type {
  ScheduleDraft,
  ScheduleErrorCode,
  ScheduleFieldError,
} from './model/scheduleDraft'
export type {
  AgendaCategory,
  AgendaDay,
  AgendaEntry,
  AgendaSchedulingState,
  AgendaSourcesState,
  AvailabilityResult,
  AvailablePeriod,
  BuildAgendaDayInput,
  ConflictLink,
  TimeConflict,
} from './model/types'

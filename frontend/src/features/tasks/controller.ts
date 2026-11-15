// Narrow public entry for Home. Re-exports only the task hook and its public
// types so composing Home does not pull task forms, rows, or dialogs into the
// initial bundle.
export { useTasks } from './model/useTasks'
export type {
  TaskNotice,
  TaskNoticeKind,
  TasksState,
  TasksController,
} from './model/useTasks'

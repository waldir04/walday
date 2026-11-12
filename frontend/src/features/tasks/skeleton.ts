// Narrow public entry point for the route fallback. The app router imports
// this module so the task slice's interactive code stays in the lazy route
// chunk instead of the initial bundle. See ADR 0006.
export { TasksPageSkeleton } from './ui/TasksPageSkeleton'

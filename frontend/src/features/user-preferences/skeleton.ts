// Narrow public entry point for the route fallback. The app router imports
// this module so the preference slice's interactive code stays in the lazy
// route chunk instead of the initial bundle.
export { PreferencesPageSkeleton } from './ui/PreferencesPageSkeleton'

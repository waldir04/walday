import type { Priority, TaskStatus } from './types'

export const TITLE_MIN_GRAPHEMES = 3
export const TITLE_MAX_GRAPHEMES = 200
export const DESCRIPTION_MAX_GRAPHEMES = 2000

export const DURATION_MIN_MINUTES = 1
export const DURATION_MAX_MINUTES = 1440

export const DEFAULT_PRIORITY: Priority = 'medium'
export const DEFAULT_STATUS: TaskStatus = 'pending'

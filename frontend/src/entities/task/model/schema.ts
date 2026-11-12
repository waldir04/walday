import { z } from 'zod'
import {
  DESCRIPTION_MAX_GRAPHEMES,
  DURATION_MAX_MINUTES,
  DURATION_MIN_MINUTES,
  TITLE_MAX_GRAPHEMES,
  TITLE_MIN_GRAPHEMES,
} from './constants'
import { isLocalDate } from './dueDate'
import { TASK_PRIORITIES, TASK_STATUSES, type LocalDate } from './types'
import { countGraphemes, isIsoTimestamp } from './validation'

export const taskSchema = z
  .object({
    id: z.string().trim().min(1),
    title: z
      .string()
      .trim()
      .refine((value) => {
        const length = countGraphemes(value)
        return length >= TITLE_MIN_GRAPHEMES && length <= TITLE_MAX_GRAPHEMES
      })
      .refine((value) => value.length > 0),
    description: z
      .string()
      .trim()
      .refine((value) => {
        const length = countGraphemes(value)
        return length >= 1 && length <= DESCRIPTION_MAX_GRAPHEMES
      })
      .optional(),
    status: z.enum(TASK_STATUSES),
    priority: z.enum(TASK_PRIORITIES),
    dueDate: z
      .custom<LocalDate>(
        (value) => typeof value === 'string' && isLocalDate(value),
      )
      .optional(),
    estimatedMinutes: z
      .number()
      .int()
      .min(DURATION_MIN_MINUTES)
      .max(DURATION_MAX_MINUTES)
      .optional(),
    createdAt: z.string().refine(isIsoTimestamp),
  })
  .strict()

export const taskDraftSchema = z
  .object({
    title: z.string(),
    description: z.string(),
    priority: z.enum(TASK_PRIORITIES),
    dueDate: z.string(),
    estimatedDurationInput: z.string(),
  })
  .strict()

export const storedTaskSchema = taskSchema

export const guestTaskStoreSchema = z
  .object({
    version: z.literal(1),
    revision: z.string().min(1),
    updatedAt: z.string().min(1),
    tasks: z.array(z.unknown()),
  })
  .strict()

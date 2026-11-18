import { z } from 'zod'
import {
  SUGGESTIONS_STORAGE_VERSION,
  SUGGESTION_DISMISSAL_LIMIT,
} from '@/shared/config/suggestions'
import { isLocalDate } from '@/shared/lib/localDateTime'

export const dismissalRecordSchema = z
  .object({
    version: z.literal(SUGGESTIONS_STORAGE_VERSION),
    localDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .refine((value) => isLocalDate(value)),
    entries: z
      .array(
        z
          .object({
            suggestionId: z.string().min(1).max(200),
            activityKey: z.string().min(1).max(200),
            changeSignature: z.string().min(1).max(400),
            dismissedAt: z
              .string()
              .refine((value) => !Number.isNaN(Date.parse(value))),
          })
          .strict(),
      )
      .max(SUGGESTION_DISMISSAL_LIMIT),
  })
  .strict()

export type ParsedDismissalRecord = z.infer<typeof dismissalRecordSchema>

import { z } from 'zod'
import { COMMITMENT_TYPES } from '@/shared/config/commitments'
import { countGraphemes } from '@/shared/lib/graphemes'
import {
  isIsoTimestamp,
  isLocalDate,
  isLocalTime,
} from '@/shared/lib/localDateTime'
import {
  COMMITMENT_DESCRIPTION_MAX_GRAPHEMES,
  COMMITMENT_TITLE_MAX_GRAPHEMES,
  COMMITMENT_TITLE_MIN_GRAPHEMES,
} from './constants'

const titleSchema = z
  .string()
  .trim()
  .refine((value) => {
    const length = countGraphemes(value)
    return (
      length >= COMMITMENT_TITLE_MIN_GRAPHEMES &&
      length <= COMMITMENT_TITLE_MAX_GRAPHEMES
    )
  })

const descriptionSchema = z
  .string()
  .trim()
  .refine((value) => {
    const length = countGraphemes(value)
    return length >= 1 && length <= COMMITMENT_DESCRIPTION_MAX_GRAPHEMES
  })

const localDateSchema = z.string().refine(isLocalDate)
const localTimeSchema = z.string().refine(isLocalTime)

export const commitmentSchema = z
  .object({
    id: z.string().uuid(),
    title: titleSchema,
    description: descriptionSchema.optional(),
    date: localDateSchema,
    startTime: localTimeSchema,
    endTime: localTimeSchema,
    type: z.enum(COMMITMENT_TYPES),
    createdAt: z.string().refine(isIsoTimestamp),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.endTime === '00:00' || value.startTime >= value.endTime) {
      context.addIssue({
        code: 'custom',
        message: 'Invalid range',
        path: ['endTime'],
      })
    }
  })

export const commitmentDraftSchema = z
  .object({
    title: z.string(),
    description: z.string(),
    date: z.string(),
    startTime: z.string(),
    endTime: z.string(),
    type: z.union([z.literal(''), z.enum(COMMITMENT_TYPES)]),
  })
  .strict()

export const commitmentStoreSchema = z
  .object({
    version: z.literal(1),
    revision: z.string().min(1),
    updatedAt: z.string().refine(isIsoTimestamp),
    commitments: z.array(z.unknown()),
  })
  .strict()

export type StoredCommitment = z.infer<typeof commitmentSchema>

import { z } from 'zod'
import { COMMITMENT_TYPES } from '@/shared/config/commitments'

export const commitmentSchema = z
  .object({
    id: z.string().trim().min(1).optional(),
    title: z.string().trim().min(1),
    description: z.string().trim().optional(),
    date: z.string().trim().min(1),
    startTime: z.string().trim().min(1),
    endTime: z.string().trim().min(1),
    type: z.enum(COMMITMENT_TYPES),
  })
  .refine((value) => value.startTime < value.endTime, {
    message: 'startTime must be earlier than endTime',
    path: ['endTime'],
  })

export const commitmentsSchema = z.array(z.unknown())

export type StoredCommitment = z.infer<typeof commitmentSchema>

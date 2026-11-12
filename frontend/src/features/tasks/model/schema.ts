import { z } from 'zod'
import { includesValue } from '@/shared/lib/includes'

export const PRIORITIES = ['low', 'medium', 'high'] as const
export type Priority = (typeof PRIORITIES)[number]

export function isPriority(value: string): value is Priority {
  return includesValue(PRIORITIES, value)
}

export const taskSchema = z.object({
  id: z.string().trim().min(1),
  title: z.string().trim().min(3),
  description: z.string().trim().optional(),
  priority: z.enum(PRIORITIES),
  dueDate: z.string().trim().optional(),
  estimatedDuration: z.string().trim().optional(),
  completed: z.boolean(),
  createdAt: z.number(),
})

export const tasksSchema = z.array(z.unknown())

export type StoredTask = z.infer<typeof taskSchema>

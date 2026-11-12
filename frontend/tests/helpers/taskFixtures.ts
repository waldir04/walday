import type { Task } from '@/entities/task'
import { TASKS_STORAGE_KEY } from '@/shared/config/tasks'

export const FIXED_NOW = new Date('2026-11-12T14:30:00.000Z')
export const FIXED_NOW_ISO = FIXED_NOW.toISOString()

export function fixedClock(): Date {
  return new Date(FIXED_NOW)
}

export function createIdSequence(prefix = 'task'): () => string {
  let index = 0
  return () => {
    index += 1
    return `${prefix}-${index}`
  }
}

export function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: '00000000-0000-4000-8000-000000000001',
    title: 'Write the weekly report',
    status: 'pending',
    priority: 'medium',
    createdAt: '2026-11-12T14:30:00.000Z',
    ...overrides,
  }
}

export function makeLegacyRecord(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id: 'legacy-1',
    title: 'Legacy task',
    description: 'Imported from the prototype',
    priority: 'high',
    dueDate: '2026-12-01',
    estimatedDuration: '1 h 30 min',
    completed: false,
    createdAt: Date.UTC(2026, 10, 12, 14, 30),
    ...overrides,
  }
}

export interface EnvelopeOverrides {
  version?: number
  revision?: string
  updatedAt?: string
  tasks?: unknown[]
}

export function makeEnvelope(
  tasks: unknown[] = [],
  overrides: EnvelopeOverrides = {},
): Record<string, unknown> {
  return {
    version: 1,
    revision: 'revision-1',
    updatedAt: FIXED_NOW_ISO,
    tasks,
    ...overrides,
  }
}

export function makeStoredTask(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id: '00000000-0000-4000-8000-000000000001',
    title: 'Write the weekly report',
    status: 'pending',
    priority: 'medium',
    createdAt: '2026-11-12T14:30:00.000Z',
    ...overrides,
  }
}

export function storedEnvelope(tasks: unknown[]): Record<string, unknown> {
  return makeEnvelope(tasks)
}

export function seedStore(
  storage: { data: Map<string, string> },
  value: unknown,
): void {
  const raw = typeof value === 'string' ? value : JSON.stringify(value)
  storage.data.set(TASKS_STORAGE_KEY, raw)
}

export function readStore(storage: {
  data: Map<string, string>
}): Record<string, unknown> {
  const raw = storage.data.get(TASKS_STORAGE_KEY)
  if (raw === undefined) throw new Error('task store is empty')
  return JSON.parse(raw) as Record<string, unknown>
}

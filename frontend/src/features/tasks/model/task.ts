export type Priority = 'low' | 'medium' | 'high'

export interface Task {
  id: string
  title: string
  description?: string
  priority: Priority
  dueDate?: string
  estimatedDuration?: string
  completed: boolean
  createdAt: number
}

export function createTask(input: Omit<Task, 'id' | 'createdAt' | 'completed'>): Task {
  return {
    id: crypto.randomUUID(),
    title: input.title.trim(),
    description: input.description?.trim() || undefined,
    priority: input.priority,
    dueDate: input.dueDate || undefined,
    estimatedDuration: input.estimatedDuration?.trim() || undefined,
    completed: false,
    createdAt: Date.now(),
  }
}

export function validateTitle(title: string): string | null {
  const trimmed = title.trim()
  if (trimmed.length < 3) return 'Title must be at least 3 characters'
  return null
}
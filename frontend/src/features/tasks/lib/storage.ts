import type { Task } from '../model/task'
import { tasksSchema, taskSchema } from '../model/schema'

const KEY = 'walday:tasks'

export function loadTasks(): Task[] {
  try {
    if (typeof localStorage === 'undefined') return []
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    const list = tasksSchema.safeParse(parsed)
    if (!list.success) return []
    return list.data.flatMap((item) => {
      const result = taskSchema.safeParse(item)
      return result.success ? [result.data] : []
    })
  } catch {
    return []
  }
}

export function saveTasks(tasks: Task[]): void {
  try {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(KEY, JSON.stringify(tasks))
  } catch {
    // Gracefully ignore storage errors (unavailable/quota/etc.)
  }
}

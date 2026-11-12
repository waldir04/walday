import type { Task } from './types'

export function compareTasks(a: Task, b: Task): number {
  if (a.status !== b.status) {
    return a.status === 'pending' ? -1 : 1
  }

  if (a.createdAt !== b.createdAt) {
    return b.createdAt.localeCompare(a.createdAt)
  }

  return a.id.localeCompare(b.id)
}

export function sortTasks(tasks: readonly Task[]): Task[] {
  return [...tasks].sort(compareTasks)
}

export function groupTasks(tasks: readonly Task[]): {
  pending: Task[]
  completed: Task[]
} {
  const sorted = sortTasks(tasks)
  return {
    pending: sorted.filter((task) => task.status === 'pending'),
    completed: sorted.filter((task) => task.status === 'completed'),
  }
}

export function orderedTasks(tasks: readonly Task[]): Task[] {
  const groups = groupTasks(tasks)
  return [...groups.pending, ...groups.completed]
}

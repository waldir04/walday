import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Task } from '@/features/tasks'
import {
  createTask,
  loadTasks,
  saveTasks,
  TaskForm,
  TaskList,
} from '@/features/tasks'

export function TasksPage() {
  const { t } = useTranslation('tasks')
  const [tasks, setTasks] = useState<Task[]>(() => loadTasks())

  useEffect(() => {
    saveTasks(tasks)
  }, [tasks])

  function addTask(input: {
    title: string
    description?: string
    priority: Task['priority']
    dueDate?: string
    estimatedDuration?: string
  }) {
    setTasks((prev) => [createTask(input), ...prev])
  }

  function toggleTask(id: string) {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)),
    )
  }

  function editTask(id: string, patch: Partial<Task>) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)))
  }

  function deleteTask(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <div className="space-y-6">
      <h1 tabIndex={-1} className="text-2xl font-semibold">
        {t('title')}
      </h1>
      <p className="text-sm text-gray-500">{t('guestNotice')}</p>
      <TaskForm onAdd={addTask} />
      <TaskList
        tasks={tasks}
        onToggle={toggleTask}
        onEdit={editTask}
        onDelete={deleteTask}
      />
    </div>
  )
}

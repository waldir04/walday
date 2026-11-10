import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Task } from '../features/tasks/model/task'
import { createTask } from '../features/tasks/model/task'
import { loadTasks, saveTasks } from '../features/tasks/lib/storage'
import { TaskForm } from '../features/tasks/ui/TaskForm'
import { TaskList } from '../features/tasks/ui/TaskList'

export function TasksPage() {
  const { t } = useTranslation()
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
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)))
  }

  function editTask(id: string, patch: Partial<Task>) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)))
  }

  function deleteTask(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{t('tasks.title')}</h1>
      <p className="text-sm text-gray-500">{t('tasks.guestNotice')}</p>
      <TaskForm onAdd={addTask} />
      <TaskList tasks={tasks} onToggle={toggleTask} onEdit={editTask} onDelete={deleteTask} />
    </div>
  )
}

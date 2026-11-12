import { useTranslation } from 'react-i18next'
import type { Task } from '../model/task'
import { TaskItem } from './TaskItem'

interface Props {
  tasks: Task[]
  onToggle: (_id: string) => void
  onEdit: (_id: string, _patch: Partial<Task>) => void
  onDelete: (_id: string) => void
}

export function TaskList({ tasks, onToggle, onEdit, onDelete }: Props) {
  const { t } = useTranslation('tasks')
  const pending = tasks
    .filter((t) => !t.completed)
    .sort((a, b) => b.createdAt - a.createdAt)
  const completed = tasks
    .filter((t) => t.completed)
    .sort((a, b) => b.createdAt - a.createdAt)
  const ordered = [...pending, ...completed]

  if (ordered.length === 0) {
    return <p className="text-text-muted">{t('empty')}</p>
  }

  return (
    <ul className="space-y-2">
      {ordered.map((t) => (
        <TaskItem
          key={t.id}
          task={t}
          onToggle={onToggle}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </ul>
  )
}

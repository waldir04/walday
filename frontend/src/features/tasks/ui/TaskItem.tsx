import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Task } from '../model/task'

interface Props {
  task: Task
  onToggle: (_id: string) => void
  onEdit: (_id: string, _patch: Partial<Task>) => void
  onDelete: (_id: string) => void
}

export function TaskItem({ task, onToggle, onEdit, onDelete }: Props) {
  const { t } = useTranslation('tasks')
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(task.title)
  const [confirmDelete, setConfirmDelete] = useState(false)

  function saveEdit() {
    onEdit(task.id, { title: title.trim() })
    setEditing(false)
  }

  return (
    <li className="rounded border border-gray-200 p-3">
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={task.completed}
          onChange={() => onToggle(task.id)}
          aria-label={
            task.completed
              ? t('item.markPending', { title: task.title })
              : t('item.markComplete', { title: task.title })
          }
        />
        <div className="flex-1">
          {editing ? (
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={saveEdit}
              aria-label={t('form.title')}
              className="w-full rounded border border-gray-300 px-2 py-1"
            />
          ) : (
            <span
              className={task.completed ? 'line-through text-text-muted' : ''}
            >
              {task.title}
            </span>
          )}
          {task.description && (
            <p className="text-sm text-text-muted">{task.description}</p>
          )}
          <div className="mt-1 flex flex-wrap gap-2 text-xs text-text-muted">
            <span>
              {t('item.priority', {
                priority: t(`form.priorityOptions.${task.priority}`),
              })}
            </span>
            {task.dueDate && (
              <span>{t('item.due', { date: task.dueDate })}</span>
            )}
            {task.estimatedDuration && (
              <span>
                {t('item.duration', { duration: task.estimatedDuration })}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className="text-sm text-primary"
          >
            {t('item.edit')}
          </button>
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="text-sm text-danger"
          >
            {t('item.delete')}
          </button>
        </div>
      </div>
      {confirmDelete && (
        <div className="mt-2 flex items-center gap-2">
          <span className="text-sm">{t('item.confirmDelete')}</span>
          <button
            type="button"
            onClick={() => onDelete(task.id)}
            className="text-sm text-danger"
          >
            {t('item.yes')}
          </button>
          <button
            type="button"
            onClick={() => setConfirmDelete(false)}
            className="text-sm"
          >
            {t('item.no')}
          </button>
        </div>
      )}
    </li>
  )
}

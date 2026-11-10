import { useState } from 'react'
import type { Task } from '../model/task'

interface Props {
  task: Task
  onToggle: (_id: string) => void
  onEdit: (_id: string, _patch: Partial<Task>) => void
  onDelete: (_id: string) => void
}

export function TaskItem({ task, onToggle, onEdit, onDelete }: Props) {
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
          aria-label={`Mark ${task.title} ${task.completed ? 'pending' : 'complete'}`}
        />
        <div className="flex-1">
          {editing ? (
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={saveEdit}
              className="w-full rounded border border-gray-300 px-2 py-1"
            />
          ) : (
            <span className={task.completed ? 'line-through text-gray-500' : ''}>{task.title}</span>
          )}
          {task.description && <p className="text-sm text-gray-600">{task.description}</p>}
          <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-500">
            <span>Priority: {task.priority}</span>
            {task.dueDate && <span>Due: {task.dueDate}</span>}
            {task.estimatedDuration && <span>Duration: {task.estimatedDuration}</span>}
          </div>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setEditing((v) => !v)} className="text-sm text-blue-600">
            Edit
          </button>
          <button type="button" onClick={() => setConfirmDelete(true)} className="text-sm text-red-600">
            Delete
          </button>
        </div>
      </div>
      {confirmDelete && (
        <div className="mt-2 flex items-center gap-2">
          <span className="text-sm">Confirm delete?</span>
          <button type="button" onClick={() => onDelete(task.id)} className="text-sm text-red-600">
            Yes
          </button>
          <button type="button" onClick={() => setConfirmDelete(false)} className="text-sm">
            Cancel
          </button>
        </div>
      )}
    </li>
  )
}
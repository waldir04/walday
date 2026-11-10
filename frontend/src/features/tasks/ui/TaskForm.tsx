import { useState } from 'react'
import type { FormEvent } from 'react'
import type { Priority } from '../model/task'
import { validateTitle } from '../model/task'

interface Props {
  onAdd: (_input: { title: string; description?: string; priority: Priority; dueDate?: string; estimatedDuration?: string }) => void
}

export function TaskForm({ onAdd }: Props) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<Priority>('medium')
  const [dueDate, setDueDate] = useState('')
  const [duration, setDuration] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const err = validateTitle(title)
    if (err) {
      setError(err)
      return
    }
    setError(null)
    onAdd({ title, description, priority, dueDate, estimatedDuration: duration })
    setTitle('')
    setDescription('')
    setPriority('medium')
    setDueDate('')
    setDuration('')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label htmlFor="title" className="block text-sm font-medium">Title</label>
        <input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
        />
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>
      <div>
        <label htmlFor="description" className="block text-sm font-medium">Description (optional)</label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
        />
      </div>
      <div className="flex gap-3">
        <div>
          <label htmlFor="priority" className="block text-sm font-medium">Priority</label>
          <select
            id="priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as Priority)}
            className="mt-1 rounded border border-gray-300 px-3 py-2"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
        <div>
          <label htmlFor="dueDate" className="block text-sm font-medium">Due date (optional)</label>
          <input
            id="dueDate"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="mt-1 rounded border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="duration" className="block text-sm font-medium">Duration (optional)</label>
          <input
            id="duration"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="30 min"
            className="mt-1 rounded border border-gray-300 px-3 py-2"
          />
        </div>
      </div>
      <button type="submit" className="rounded bg-blue-600 px-4 py-2 text-white">Add task</button>
    </form>
  )
}
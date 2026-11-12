import { useState } from 'react'
import type { FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import type { Priority } from '../model/task'
import { validateTitle } from '../model/task'
import { isPriority } from '../model/schema'

interface Props {
  onAdd: (_input: {
    title: string
    description?: string
    priority: Priority
    dueDate?: string
    estimatedDuration?: string
  }) => void
}

export function TaskForm({ onAdd }: Props) {
  const { t } = useTranslation('tasks')
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
    onAdd({
      title,
      description,
      priority,
      dueDate,
      estimatedDuration: duration,
    })
    setTitle('')
    setDescription('')
    setPriority('medium')
    setDueDate('')
    setDuration('')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3" aria-label={t('title')}>
      <div>
        <label htmlFor="title" className="block text-sm font-medium">
          {t('form.title')}
        </label>
        <input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'task-title-error' : undefined}
        />
        {error && (
          <p
            id="task-title-error"
            className="mt-1 text-sm text-danger"
            role="alert"
          >
            {t(error)}
          </p>
        )}
      </div>
      <div>
        <label htmlFor="description" className="block text-sm font-medium">
          {t('form.description')}
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
        />
      </div>
      <div className="flex flex-wrap gap-3">
        <div>
          <label htmlFor="priority" className="block text-sm font-medium">
            {t('form.priority')}
          </label>
          <select
            id="priority"
            value={priority}
            onChange={(e) => {
              const value = e.target.value
              if (isPriority(value)) setPriority(value)
            }}
            className="mt-1 rounded border border-gray-300 px-3 py-2"
          >
            <option value="low">{t('form.priorityOptions.low')}</option>
            <option value="medium">{t('form.priorityOptions.medium')}</option>
            <option value="high">{t('form.priorityOptions.high')}</option>
          </select>
        </div>
        <div>
          <label htmlFor="dueDate" className="block text-sm font-medium">
            {t('form.dueDate')}
          </label>
          <input
            id="dueDate"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="mt-1 rounded border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="duration" className="block text-sm font-medium">
            {t('form.duration')}
          </label>
          <input
            id="duration"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder={t('form.durationPlaceholder')}
            className="mt-1 rounded border border-gray-300 px-3 py-2"
          />
        </div>
      </div>
      <button
        type="submit"
        className="rounded bg-primary px-4 py-2 text-text-inverse"
      >
        {t('form.submit')}
      </button>
    </form>
  )
}

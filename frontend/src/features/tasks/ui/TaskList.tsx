import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { groupTasks, type Task, type TaskDraft } from '@/entities/task'
import type { DateTimePresentation } from '@/shared/config/preferences'
import { Button } from '@/shared/ui/Button'
import { EmptyState } from '@/shared/ui/EmptyState'
import { TaskItem } from './TaskItem'

export interface TaskListProps {
  tasks: Task[]
  showEmpty: boolean
  pending: boolean
  formattingLocale?: string
  presentation?: DateTimePresentation
  focusAfterDelete: string | 'empty' | null
  onDeleteFocusHandled: () => void
  focusCompletionTaskId: string | null
  onCompletionFocused: () => void
  onCreateRequested: () => void
  onToggle: (_id: string) => Promise<boolean>
  onUpdate: (_id: string, _draft: TaskDraft) => Promise<boolean>
  onDelete: (_id: string) => Promise<boolean>
  onDraftActiveChange: (_active: boolean) => void
  onDialogActiveChange: (_active: boolean) => void
}

export function TaskList({
  tasks,
  showEmpty,
  pending,
  formattingLocale,
  presentation,
  focusAfterDelete,
  onDeleteFocusHandled,
  focusCompletionTaskId,
  onCompletionFocused,
  onCreateRequested,
  onToggle,
  onUpdate,
  onDelete,
  onDraftActiveChange,
  onDialogActiveChange,
}: TaskListProps) {
  const { t } = useTranslation('tasks')
  const groups = useMemo(() => groupTasks(tasks), [tasks])
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const emptyActionRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (focusAfterDelete === null) return

    if (focusAfterDelete === 'empty') {
      emptyActionRef.current?.focus()
    } else {
      const element = document.querySelector<HTMLElement>(
        `[data-completion-for="${focusAfterDelete}"]`,
      )
      element?.focus()
    }
    onDeleteFocusHandled()
  }, [focusAfterDelete, tasks, onDeleteFocusHandled])

  async function saveEdit(taskId: string, draft: TaskDraft): Promise<boolean> {
    const saved = await onUpdate(taskId, draft)
    if (saved) setEditingTaskId(null)
    return saved
  }

  if (tasks.length === 0) {
    if (!showEmpty) return null
    return (
      <EmptyState
        heading={t('empty.heading')}
        description={t('empty.description')}
        action={
          <Button buttonRef={emptyActionRef} onClick={onCreateRequested}>
            {t('empty.action')}
          </Button>
        }
      />
    )
  }

  function renderGroup(id: string, heading: string, groupTasksList: Task[]) {
    if (groupTasksList.length === 0) return null
    return (
      <section aria-labelledby={id} className="space-y-stack">
        <h2 id={id} className="text-title font-semibold text-text">
          {heading}
        </h2>
        <ul className="space-y-stack">
          {groupTasksList.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              editing={editingTaskId === task.id}
              pending={pending}
              formattingLocale={formattingLocale}
              presentation={presentation}
              shouldFocusCompletion={focusCompletionTaskId === task.id}
              onCompletionFocused={onCompletionFocused}
              onToggle={() => onToggle(task.id)}
              onStartEdit={() => setEditingTaskId(task.id)}
              onCancelEdit={() => setEditingTaskId(null)}
              onSaveEdit={(draft) => saveEdit(task.id, draft)}
              onDelete={() => onDelete(task.id)}
              onDraftActiveChange={onDraftActiveChange}
              onDialogActiveChange={onDialogActiveChange}
            />
          ))}
        </ul>
      </section>
    )
  }

  return (
    <div className="space-y-section">
      {renderGroup(
        'pending-group-heading',
        t('groups.pending'),
        groups.pending,
      )}
      {renderGroup(
        'completed-group-heading',
        t('groups.completed'),
        groups.completed,
      )}
    </div>
  )
}

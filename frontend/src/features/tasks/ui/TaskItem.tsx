import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Task, TaskDraft } from '@/entities/task'
import { RowActions, type RowActionView } from '@/shared/ui/RowActions'
import { DeleteTaskDialog } from './DeleteTaskDialog'
import { TaskEditForm } from './TaskEditForm'
import { TaskMetadata } from './TaskMetadata'

export interface TaskItemProps {
  task: Task
  editing: boolean
  pending: boolean
  formattingLocale?: string
  dateStyle?: Intl.DateTimeFormatOptions['dateStyle']
  shouldFocusCompletion: boolean
  onCompletionFocused: () => void
  onToggle: () => Promise<boolean>
  onStartEdit: () => void
  onCancelEdit: () => void
  onSaveEdit: (_draft: TaskDraft) => Promise<boolean>
  onDelete: () => Promise<boolean>
  onDraftActiveChange: (_active: boolean) => void
  onDialogActiveChange: (_active: boolean) => void
}

export function TaskItem({
  task,
  editing,
  pending,
  formattingLocale,
  dateStyle,
  shouldFocusCompletion,
  onCompletionFocused,
  onToggle,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  onDraftActiveChange,
  onDialogActiveChange,
}: TaskItemProps) {
  const { t } = useTranslation('tasks')
  const completionRef = useRef<HTMLInputElement>(null)
  const editButtonRef = useRef<HTMLButtonElement>(null)
  const deleteButtonRef = useRef<HTMLButtonElement>(null)
  const wasEditing = useRef(editing)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  useEffect(() => {
    if (shouldFocusCompletion) {
      completionRef.current?.focus()
      onCompletionFocused()
    }
  }, [shouldFocusCompletion, onCompletionFocused])

  useEffect(() => {
    if (wasEditing.current && !editing) {
      editButtonRef.current?.focus()
    }
    wasEditing.current = editing
  }, [editing])

  function requestDelete() {
    if (pending) return
    deleteButtonRef.current?.focus()
    setConfirmingDelete(true)
    onDialogActiveChange(true)
  }

  function closeDeleteDialog() {
    setConfirmingDelete(false)
    onDialogActiveChange(false)
  }

  function confirmDelete() {
    closeDeleteDialog()
    void onDelete()
  }

  return (
    <li className="group rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-start gap-3">
        <input
          ref={completionRef}
          type="checkbox"
          checked={task.status === 'completed'}
          onChange={() => {
            void onToggle()
          }}
          disabled={pending}
          data-completion-for={task.id}
          aria-label={
            task.status === 'completed'
              ? t('item.markPending', { title: task.title })
              : t('item.markComplete', { title: task.title })
          }
          className="mt-1 h-6 w-6 min-h-6 min-w-6 rounded border-border-strong text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        />

        <div className="min-w-0 flex-1">
          {editing ? (
            <TaskEditForm
              task={task}
              onSave={onSaveEdit}
              onCancel={onCancelEdit}
              pending={pending}
              onDraftActiveChange={onDraftActiveChange}
            />
          ) : (
            <>
              <p
                className={
                  task.status === 'completed'
                    ? 'break-words text-body text-text-muted line-through'
                    : 'break-words text-body text-text'
                }
              >
                {task.title}
              </p>
              {task.description ? (
                <p className="mt-1 break-words text-body text-text-muted">
                  {task.description}
                </p>
              ) : null}
              <TaskMetadata
                task={task}
                formattingLocale={formattingLocale}
                dateStyle={dateStyle}
              />
            </>
          )}
        </div>

        {editing ? null : (
          <RowActions
            menuLabel={t('actions.menuLabel', {
              title: task.title,
              ns: 'common',
            })}
            actions={
              [
                {
                  id: 'edit',
                  label: t('item.editTask', { title: task.title }),
                  onSelect: () => {
                    if (!pending) onStartEdit()
                  },
                  buttonRef: editButtonRef,
                },
                {
                  id: 'delete',
                  label: t('item.deleteTask', { title: task.title }),
                  onSelect: requestDelete,
                  tone: 'danger',
                  buttonRef: deleteButtonRef,
                },
              ] satisfies RowActionView[]
            }
          />
        )}
      </div>

      <DeleteTaskDialog
        open={confirmingDelete}
        taskTitle={task.title}
        onConfirm={confirmDelete}
        onCancel={closeDeleteDialog}
      />
    </li>
  )
}

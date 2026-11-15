import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { resolveDateStyle, usePreferences } from '@/entities/preferences'
import {
  GuestStorageNotice,
  RecoveryNotice,
  StorageWarning,
  TaskForm,
  TaskList,
  useTasks,
} from '@/features/tasks'
import type { TaskNotice } from '@/features/tasks'
import { Button } from '@/shared/ui/Button'

function NoticeRegion({ notice }: { notice: TaskNotice | null }) {
  const { t } = useTranslation('tasks')

  const colorClass =
    notice?.kind === 'success'
      ? 'text-success'
      : notice?.kind === 'session-only'
        ? 'text-warning'
        : notice?.kind === 'conflict' || notice?.kind === 'error'
          ? 'text-danger'
          : 'text-text-muted'

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="min-h-6 text-body"
    >
      {notice ? (
        <div className="flex flex-wrap items-center gap-2">
          <p className={colorClass}>{t(notice.messageKey)}</p>
          {notice.kind === 'conflict' ? (
            <Button
              variant="secondary"
              onClick={() => {
                window.location.reload()
              }}
            >
              {t('feedback.reload')}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export function TasksPage() {
  const { t } = useTranslation('tasks')
  const { preferences, formattingLocale } = usePreferences()
  const tasks = useTasks()
  const createTitleRef = useRef<HTMLInputElement>(null)

  const showEmpty =
    !tasks.quarantine &&
    !tasks.unsupported &&
    tasks.mode !== 'recovery-blocked' &&
    tasks.mode !== 'protected'

  return (
    <div className="space-y-section">
      <div className="space-y-2">
        <h1 tabIndex={-1} className="text-title font-semibold text-text">
          {t('title')}
        </h1>
        <GuestStorageNotice />
      </div>

      <NoticeRegion notice={tasks.notice} />

      <StorageWarning
        mode={tasks.mode}
        pending={tasks.pending}
        onRetry={() => {
          void tasks.retryPersistence()
        }}
      />

      <RecoveryNotice
        quarantine={tasks.quarantine}
        unsupported={tasks.unsupported}
        pending={tasks.pending}
        onDiscard={() => {
          void tasks.discardUnreadable()
        }}
        onCancelDiscard={tasks.protectStore}
        onDialogActiveChange={tasks.reportDialogActive}
      />

      <TaskForm
        onSubmit={tasks.createTask}
        pending={tasks.pending}
        titleInputRef={createTitleRef}
        onDraftActiveChange={tasks.reportDraftActive}
      />

      <TaskList
        tasks={tasks.tasks}
        formattingLocale={formattingLocale}
        showEmpty={showEmpty}
        pending={tasks.pending}
        dateStyle={resolveDateStyle(preferences.dateTimePresentation)}
        focusAfterDelete={tasks.focusAfterDelete}
        onDeleteFocusHandled={tasks.handleDeleteFocusHandled}
        focusCompletionTaskId={tasks.focusCompletionTaskId}
        onCompletionFocused={tasks.handleCompletionFocusHandled}
        onCreateRequested={() => createTitleRef.current?.focus()}
        onToggle={tasks.toggleTask}
        onUpdate={tasks.updateTask}
        onDelete={tasks.deleteTask}
        onDraftActiveChange={tasks.reportDraftActive}
        onDialogActiveChange={tasks.reportDialogActive}
      />
    </div>
  )
}

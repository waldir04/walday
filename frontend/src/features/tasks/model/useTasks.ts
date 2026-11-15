import { useCallback, useEffect, useRef, useState } from 'react'
import {
  DEFAULT_STATUS,
  loadGuestTaskStore,
  orderedTasks,
  quarantineTotal,
  saveGuestTaskStore,
  validateStoredTask,
  type PersistenceMode,
  type QuarantineSummary,
  type RevisionBaseline,
  type ScheduleSlot,
  type Task,
  type TaskDraft,
  type TaskStorageDependencies,
  type WriteBlockCause,
} from '@/entities/task'
import { TASKS_STORAGE_KEY } from '@/shared/config/tasks'
import { fieldsFromDraft } from './taskDraft'

export type TaskNoticeKind =
  'success' | 'session-only' | 'conflict' | 'info' | 'error'

export interface TaskNotice {
  kind: TaskNoticeKind
  messageKey: string
}

export interface TasksState {
  tasks: Task[]
  mode: PersistenceMode
  baseline: RevisionBaseline
  revision?: string
  updatedAt?: string
  pending: boolean
  externalChange: boolean
  quarantine: QuarantineSummary | null
  unsupported: boolean
  notice: TaskNotice | null
  localDraft: boolean
  dialogOpen: boolean
  focusCompletionTaskId: string | null
  focusAfterDelete: string | 'empty' | null
}

function blockedMode(cause: WriteBlockCause | undefined): PersistenceMode {
  switch (cause) {
    case 'unsupported':
      return 'unsupported'
    case 'recovery-blocked':
    case 'corrupt':
      return 'recovery-blocked'
    case 'protected':
      return 'protected'
    default:
      return 'memory-only'
  }
}

function noticeForLoad(result: ReturnType<typeof loadGuestTaskStore>): {
  tasks: Task[]
  mode: PersistenceMode
  baseline: RevisionBaseline
  revision?: string
  updatedAt?: string
  quarantine: QuarantineSummary | null
  unsupported: boolean
  notice: TaskNotice | null
} {
  switch (result.kind) {
    case 'empty':
      return {
        tasks: [],
        mode: 'normal',
        baseline: 'empty',
        quarantine: null,
        unsupported: false,
        notice: null,
      }
    case 'restored':
      return {
        tasks: result.tasks,
        mode: 'normal',
        baseline: result.revision,
        revision: result.revision,
        updatedAt: result.updatedAt,
        quarantine: null,
        unsupported: false,
        notice:
          result.tasks.length > 0
            ? { kind: 'info', messageKey: 'feedback.restored' }
            : null,
      }
    case 'partial':
      return {
        tasks: result.tasks,
        mode: 'recovery-blocked',
        baseline: result.revision || 'unknown',
        revision: result.revision || undefined,
        updatedAt: result.updatedAt || undefined,
        quarantine: result.quarantine,
        unsupported: false,
        notice: { kind: 'info', messageKey: 'feedback.restoredPartial' },
      }
    case 'legacy': {
      const quarantined = quarantineTotal(result.quarantine) > 0
      return {
        tasks: result.tasks,
        mode: quarantined ? 'recovery-blocked' : 'normal',
        baseline: 'legacy',
        quarantine: quarantined ? result.quarantine : null,
        unsupported: false,
        notice:
          result.tasks.length > 0
            ? { kind: 'info', messageKey: 'feedback.restored' }
            : null,
      }
    }
    case 'corrupt':
      return {
        tasks: [],
        mode: 'recovery-blocked',
        baseline: 'unknown',
        quarantine: {
          invalidRecords: 1,
          duplicateIdentities: 0,
          reasonCodes: [],
        },
        unsupported: false,
        notice: { kind: 'error', messageKey: 'storage.recoveryBlockedHeading' },
      }
    case 'migration-failed':
      return {
        tasks: [],
        mode: 'protected',
        baseline: 'unknown',
        quarantine: null,
        unsupported: false,
        notice: { kind: 'error', messageKey: 'storage.protectedHeading' },
      }
    case 'unsupported':
      return {
        tasks: [],
        mode: 'unsupported',
        baseline: 'unknown',
        quarantine: null,
        unsupported: true,
        notice: { kind: 'error', messageKey: 'storage.unsupportedHeading' },
      }
    case 'unavailable':
      return {
        tasks: [],
        mode: 'memory-only',
        baseline: 'unknown',
        quarantine: null,
        unsupported: false,
        notice: {
          kind: 'session-only',
          messageKey: 'storage.memoryOnlyHeading',
        },
      }
  }
}

export function createInitialTasksState(
  deps?: TaskStorageDependencies,
): TasksState {
  const loaded = noticeForLoad(loadGuestTaskStore(deps))
  return {
    ...loaded,
    pending: false,
    externalChange: false,
    localDraft: false,
    dialogOpen: false,
    focusCompletionTaskId: null,
    focusAfterDelete: null,
  }
}

export function useTasks(deps?: TaskStorageDependencies) {
  const [state, setState] = useState<TasksState>(() =>
    createInitialTasksState(deps),
  )
  const stateRef = useRef(state)
  const depsRef = useRef(deps)

  useEffect(() => {
    depsRef.current = deps
  }, [deps])

  const commit = useCallback((next: TasksState) => {
    stateRef.current = next
    setState(next)
  }, [])

  async function runMutation(
    nextTasks: Task[],
    successKey: string,
    sessionKey: string,
    extras: Partial<
      Pick<TasksState, 'focusCompletionTaskId' | 'focusAfterDelete'>
    > = {},
  ): Promise<boolean> {
    const before = stateRef.current
    if (before.pending) return false

    if (before.externalChange) {
      commit({
        ...before,
        notice: { kind: 'conflict', messageKey: 'feedback.conflict' },
      })
      return false
    }

    commit({ ...before, pending: true, notice: null })

    if (before.mode !== 'normal') {
      commit({
        ...stateRef.current,
        ...extras,
        tasks: nextTasks,
        pending: false,
        notice: { kind: 'session-only', messageKey: sessionKey },
      })
      return true
    }

    const result = await saveGuestTaskStore(
      nextTasks,
      before.baseline,
      before.mode,
      'automatic',
      depsRef.current,
    )
    const current = stateRef.current

    if (result.ok) {
      commit({
        ...current,
        ...extras,
        tasks: nextTasks,
        mode: 'normal',
        baseline: result.revision,
        revision: result.revision,
        updatedAt: result.updatedAt,
        externalChange: false,
        quarantine: null,
        pending: false,
        notice: { kind: 'success', messageKey: successKey },
      })
      return true
    }

    if (result.code === 'STORAGE_CONFLICT') {
      commit({
        ...current,
        pending: false,
        externalChange: true,
        notice: { kind: 'conflict', messageKey: 'feedback.conflict' },
      })
      return false
    }

    const mode =
      result.code === 'STORAGE_WRITE_BLOCKED'
        ? blockedMode(result.cause)
        : 'memory-only'

    commit({
      ...current,
      ...extras,
      tasks: nextTasks,
      mode,
      pending: false,
      notice: { kind: 'session-only', messageKey: sessionKey },
    })
    return true
  }

  async function createTask(draft: TaskDraft): Promise<boolean> {
    const before = stateRef.current
    if (before.pending) return false

    const fields = fieldsFromDraft(draft)
    if (!fields.ok) return false

    const now = (depsRef.current?.now ?? (() => new Date()))()
    const id = (depsRef.current?.randomId ?? (() => crypto.randomUUID()))()

    const task: Task = {
      id,
      ...fields.value,
      status: DEFAULT_STATUS,
      createdAt: now.toISOString(),
    }

    return runMutation(
      [...before.tasks, task],
      'feedback.created',
      'feedback.createdSessionOnly',
    )
  }

  async function updateTask(id: string, draft: TaskDraft): Promise<boolean> {
    const before = stateRef.current
    if (before.pending) return false

    const task = before.tasks.find((candidate) => candidate.id === id)
    if (!task) return false

    const fields = fieldsFromDraft(draft)
    if (!fields.ok) return false

    const scheduledMinutes =
      task.plannedDate !== undefined ? task.estimatedMinutes : undefined
    const estimatedMinutes = fields.value.estimatedMinutes ?? scheduledMinutes

    const updated: Task = {
      id: task.id,
      title: fields.value.title,
      status: task.status,
      priority: fields.value.priority,
      createdAt: task.createdAt,
      ...(fields.value.description
        ? { description: fields.value.description }
        : {}),
      ...(fields.value.dueDate ? { dueDate: fields.value.dueDate } : {}),
      ...(estimatedMinutes !== undefined ? { estimatedMinutes } : {}),
      ...(task.plannedDate !== undefined && task.plannedStartTime !== undefined
        ? {
            plannedDate: task.plannedDate,
            plannedStartTime: task.plannedStartTime,
          }
        : {}),
    }

    const nextTasks = before.tasks.map((candidate) =>
      candidate.id === id ? updated : candidate,
    )

    return runMutation(
      nextTasks,
      'feedback.updated',
      'feedback.updatedSessionOnly',
    )
  }

  async function deleteTask(id: string): Promise<boolean> {
    const before = stateRef.current
    if (before.pending) return false

    const ordered = orderedTasks(before.tasks)
    const index = ordered.findIndex((task) => task.id === id)
    if (index === -1) return false

    const nextTasks = before.tasks.filter((task) => task.id !== id)
    const nextTask = ordered[index + 1] ?? ordered[index - 1] ?? null
    const focusAfterDelete =
      nextTasks.length === 0 ? 'empty' : (nextTask?.id ?? null)

    return runMutation(
      nextTasks,
      'feedback.deleted',
      'feedback.deletedSessionOnly',
      { focusAfterDelete },
    )
  }

  async function toggleTask(id: string): Promise<boolean> {
    const before = stateRef.current
    if (before.pending) return false

    const task = before.tasks.find((candidate) => candidate.id === id)
    if (!task) return false

    const nextStatus: Task['status'] =
      task.status === 'pending' ? 'completed' : 'pending'
    const nextTasks = before.tasks.map((candidate) =>
      candidate.id === id ? { ...candidate, status: nextStatus } : candidate,
    )

    return runMutation(
      nextTasks,
      nextStatus === 'completed' ? 'feedback.completed' : 'feedback.pending',
      'feedback.statusSessionOnly',
      { focusCompletionTaskId: id },
    )
  }

  async function scheduleTask(
    id: string,
    slot: ScheduleSlot,
  ): Promise<boolean> {
    const before = stateRef.current
    if (before.pending) return false

    const task = before.tasks.find((candidate) => candidate.id === id)
    if (!task || task.status !== 'pending') return false

    const validated = validateStoredTask({
      ...task,
      plannedDate: slot.plannedDate,
      plannedStartTime: slot.plannedStartTime,
      estimatedMinutes: slot.estimatedMinutes,
    })
    if (!validated.ok) return false

    const nextTasks = before.tasks.map((candidate) =>
      candidate.id === id ? validated.value : candidate,
    )

    return runMutation(
      nextTasks,
      'feedback.scheduled',
      'feedback.scheduledSessionOnly',
    )
  }

  async function unscheduleTask(id: string): Promise<boolean> {
    const before = stateRef.current
    if (before.pending) return false

    const task = before.tasks.find((candidate) => candidate.id === id)
    if (!task) return false

    const nextTask: Task = {
      id: task.id,
      title: task.title,
      status: task.status,
      priority: task.priority,
      createdAt: task.createdAt,
      ...(task.description ? { description: task.description } : {}),
      ...(task.dueDate ? { dueDate: task.dueDate } : {}),
      ...(task.estimatedMinutes !== undefined
        ? { estimatedMinutes: task.estimatedMinutes }
        : {}),
    }

    const nextTasks = before.tasks.map((candidate) =>
      candidate.id === id ? nextTask : candidate,
    )

    return runMutation(
      nextTasks,
      'feedback.unscheduled',
      'feedback.unscheduledSessionOnly',
    )
  }

  async function retryPersistence(): Promise<void> {
    const before = stateRef.current
    if (before.mode !== 'memory-only' || before.pending) return

    commit({ ...before, pending: true, notice: null })
    const result = await saveGuestTaskStore(
      before.tasks,
      before.baseline,
      'memory-only',
      'retry',
      depsRef.current,
    )
    const current = stateRef.current

    if (result.ok) {
      commit({
        ...current,
        mode: 'normal',
        baseline: result.revision,
        revision: result.revision,
        updatedAt: result.updatedAt,
        externalChange: false,
        pending: false,
        notice: { kind: 'success', messageKey: 'feedback.retrySucceeded' },
      })
      return
    }

    if (result.code === 'STORAGE_CONFLICT') {
      commit({
        ...current,
        pending: false,
        externalChange: true,
        notice: { kind: 'conflict', messageKey: 'feedback.conflict' },
      })
      return
    }

    commit({
      ...current,
      pending: false,
      notice: { kind: 'session-only', messageKey: 'feedback.retryFailed' },
    })
  }

  async function discardUnreadable(): Promise<void> {
    const before = stateRef.current
    if (
      (before.mode !== 'recovery-blocked' && before.mode !== 'protected') ||
      before.pending
    ) {
      return
    }

    commit({ ...before, pending: true, notice: null })
    const result = await saveGuestTaskStore(
      before.tasks,
      before.baseline,
      before.mode,
      'discard-unreadable',
      depsRef.current,
    )
    const current = stateRef.current

    if (result.ok) {
      commit({
        ...current,
        mode: 'normal',
        baseline: result.revision,
        revision: result.revision,
        updatedAt: result.updatedAt,
        quarantine: null,
        externalChange: false,
        pending: false,
        notice: { kind: 'success', messageKey: 'feedback.discarded' },
      })
      return
    }

    commit({
      ...current,
      pending: false,
      notice: { kind: 'error', messageKey: 'storage.protectedHeading' },
    })
  }

  function protectStore(): void {
    const before = stateRef.current
    if (before.mode !== 'recovery-blocked') return
    commit({
      ...before,
      mode: 'protected',
      notice: { kind: 'info', messageKey: 'feedback.protected' },
    })
  }

  function reportDraftActive(active: boolean): void {
    const before = stateRef.current
    if (before.localDraft === active) return
    commit({ ...before, localDraft: active })
  }

  function reportDialogActive(active: boolean): void {
    const before = stateRef.current
    if (before.dialogOpen === active) return
    commit({ ...before, dialogOpen: active })
  }

  function handleCompletionFocusHandled(): void {
    const before = stateRef.current
    if (before.focusCompletionTaskId === null) return
    commit({ ...before, focusCompletionTaskId: null })
  }

  function handleDeleteFocusHandled(): void {
    const before = stateRef.current
    if (before.focusAfterDelete === null) return
    commit({ ...before, focusAfterDelete: null })
  }

  useEffect(() => {
    function handleStorageEvent(event: StorageEvent) {
      if (event.key !== TASKS_STORAGE_KEY) return
      const before = stateRef.current
      const idle =
        !before.pending &&
        !before.localDraft &&
        !before.dialogOpen &&
        before.mode === 'normal'

      if (event.newValue === null) {
        if (idle) {
          commit({
            ...before,
            tasks: [],
            baseline: 'empty',
            revision: undefined,
            updatedAt: undefined,
            quarantine: null,
            notice: {
              kind: 'info',
              messageKey: 'feedback.clearedElsewhere',
            },
          })
        } else {
          commit({
            ...before,
            externalChange: true,
            notice: {
              kind: 'conflict',
              messageKey: 'feedback.clearedElsewhere',
            },
          })
        }
        return
      }

      const loaded = loadGuestTaskStore(depsRef.current)

      if (loaded.kind === 'restored') {
        if (idle) {
          commit({
            ...before,
            tasks: loaded.tasks,
            mode: 'normal',
            baseline: loaded.revision,
            revision: loaded.revision,
            updatedAt: loaded.updatedAt,
            quarantine: null,
            notice: {
              kind: 'info',
              messageKey: 'feedback.updatedElsewhere',
            },
          })
        } else {
          commit({
            ...before,
            externalChange: true,
            notice: { kind: 'conflict', messageKey: 'feedback.newerData' },
          })
        }
        return
      }

      if (
        loaded.kind === 'legacy' &&
        quarantineTotal(loaded.quarantine) === 0
      ) {
        if (idle) {
          commit({
            ...before,
            tasks: loaded.tasks,
            mode: 'normal',
            baseline: 'legacy',
            quarantine: null,
            notice: {
              kind: 'info',
              messageKey: 'feedback.updatedElsewhere',
            },
          })
        } else {
          commit({
            ...before,
            externalChange: true,
            notice: { kind: 'conflict', messageKey: 'feedback.newerData' },
          })
        }
        return
      }

      if (loaded.kind === 'empty') {
        if (idle) {
          commit({
            ...before,
            tasks: [],
            baseline: 'empty',
            revision: undefined,
            updatedAt: undefined,
            notice: {
              kind: 'info',
              messageKey: 'feedback.clearedElsewhere',
            },
          })
        } else {
          commit({
            ...before,
            externalChange: true,
            notice: {
              kind: 'conflict',
              messageKey: 'feedback.clearedElsewhere',
            },
          })
        }
        return
      }

      commit({
        ...before,
        externalChange: true,
        notice: { kind: 'error', messageKey: 'feedback.newerData' },
      })
    }

    window.addEventListener('storage', handleStorageEvent)
    return () => {
      window.removeEventListener('storage', handleStorageEvent)
    }
  }, [commit])

  return {
    ...state,
    createTask,
    updateTask,
    deleteTask,
    toggleTask,
    scheduleTask,
    unscheduleTask,
    retryPersistence,
    discardUnreadable,
    protectStore,
    reportDraftActive,
    reportDialogActive,
    handleCompletionFocusHandled,
    handleDeleteFocusHandled,
  }
}

export type TasksController = ReturnType<typeof useTasks>

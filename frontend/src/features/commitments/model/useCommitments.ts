import { useCallback, useEffect, useRef, useState } from 'react'
import {
  findOverlaps,
  loadCommitments,
  orderedCommitments,
  saveCommitments,
  validateCommitmentDraft,
  type Commitment,
  type CommitmentDraft,
  type CommitmentFieldError,
  type CommitmentLoadResult,
  type CommitmentStorageDependencies,
  type PersistenceMode,
  type QuarantineSummary,
  type RevisionBaseline,
} from '@/entities/commitment'
import { COMMITMENTS_STORAGE_KEY } from '@/shared/config/commitments'
import { emptyCommitmentDraft, isScheduleChanged } from './commitmentDraft'

export type CommitmentNoticeKind = 'success' | 'error' | 'info' | 'warning'

export interface CommitmentNotice {
  kind: CommitmentNoticeKind
  messageKey: string
}

export interface CommitmentMutationSuccess {
  ok: true
}

export interface CommitmentMutationFailure {
  ok: false
  reason:
    'validation' | 'overlap' | 'storage' | 'blocked' | 'duplicate' | 'missing'
  errors?: CommitmentFieldError[]
  conflicts?: Commitment[]
  noticeKey?: string
}

export type CommitmentMutationResult =
  CommitmentMutationSuccess | CommitmentMutationFailure

interface State {
  commitments: Commitment[]
  mode: PersistenceMode
  baseline: RevisionBaseline
  revision?: string
  updatedAt?: string
  pending: boolean
  externalChange: boolean
  quarantine: QuarantineSummary | null
  unsupported: boolean
  notice: CommitmentNotice | null
  focusAfterDelete: string | 'empty' | null
  ready: boolean
}

function loadedState(result: CommitmentLoadResult): State {
  const base: State = {
    commitments: [],
    mode: 'normal',
    baseline: { revision: 'unknown' },
    pending: false,
    externalChange: false,
    quarantine: null,
    unsupported: false,
    notice: null,
    focusAfterDelete: null,
    ready: true,
  }

  switch (result.kind) {
    case 'empty':
      return { ...base, baseline: { revision: 'empty' } }
    case 'restored':
      return {
        ...base,
        commitments: result.commitments,
        baseline: { revision: result.revision },
        revision: result.revision,
        updatedAt: result.updatedAt,
      }
    case 'partial':
      return {
        ...base,
        commitments: result.commitments,
        mode: 'recovery-blocked',
        baseline: { revision: result.revision },
        revision: result.revision,
        updatedAt: result.updatedAt,
        quarantine: result.quarantine,
        notice: { kind: 'warning', messageKey: 'commitments.notices.partial' },
      }
    case 'legacy':
      return {
        ...base,
        commitments: result.commitments,
        baseline: { revision: 'legacy' },
        quarantine:
          result.quarantine.invalidRecords > 0 ? result.quarantine : null,
        notice:
          result.quarantine.invalidRecords > 0
            ? { kind: 'warning', messageKey: 'commitments.notices.partial' }
            : null,
      }
    case 'corrupt':
      return {
        ...base,
        mode: 'recovery-blocked',
        notice: { kind: 'error', messageKey: 'commitments.notices.corrupt' },
      }
    case 'migration-failed':
      return {
        ...base,
        mode: 'recovery-blocked',
        notice: {
          kind: 'error',
          messageKey: 'commitments.notices.migrationFailed',
        },
      }
    case 'unsupported':
      return {
        ...base,
        mode: 'unsupported',
        unsupported: true,
        notice: {
          kind: 'error',
          messageKey: 'commitments.notices.unsupported',
        },
      }
    case 'unavailable':
      return {
        ...base,
        notice: {
          kind: 'warning',
          messageKey: 'commitments.notices.storageUnavailable',
        },
      }
  }
}

function storageNotice(code: string): CommitmentNotice {
  switch (code) {
    case 'STORAGE_QUOTA_EXCEEDED':
      return { kind: 'error', messageKey: 'commitments.notices.storageQuota' }
    case 'STORAGE_WRITE_FAILED':
      return {
        kind: 'error',
        messageKey: 'commitments.notices.storageUnavailable',
      }
    case 'STORAGE_WRITE_BLOCKED':
      return { kind: 'error', messageKey: 'commitments.notices.storageBlocked' }
    default:
      return {
        kind: 'error',
        messageKey: 'commitments.notices.storageUnavailable',
      }
  }
}

export function createInitialCommitmentState(
  deps?: CommitmentStorageDependencies,
): State {
  return loadedState(loadCommitments(deps))
}

export function useCommitments(deps?: CommitmentStorageDependencies) {
  const [state, setState] = useState<State>(() =>
    createInitialCommitmentState(deps),
  )
  const stateRef = useRef(state)
  const depsRef = useRef(deps)

  useEffect(() => {
    depsRef.current = deps
  }, [deps])

  const commit = useCallback((next: State) => {
    stateRef.current = next
    setState(next)
  }, [])

  const persist = useCallback(
    async (
      nextCommitments: Commitment[],
      successKey: string,
      extras: Partial<Pick<State, 'focusAfterDelete'>> = {},
    ): Promise<CommitmentMutationResult> => {
      const before = stateRef.current
      if (before.pending) return { ok: false, reason: 'duplicate' }
      if (before.externalChange) {
        commit({
          ...before,
          notice: {
            kind: 'error',
            messageKey: 'commitments.notices.storageBlocked',
          },
        })
        return { ok: false, reason: 'blocked' }
      }

      commit({ ...before, pending: true, notice: null })

      const result = await saveCommitments(
        nextCommitments,
        before.baseline,
        before.mode,
        depsRef.current,
      )
      const current = stateRef.current

      if (result.ok) {
        commit({
          ...current,
          ...extras,
          commitments: nextCommitments,
          baseline: { revision: result.revision },
          revision: result.revision,
          updatedAt: result.updatedAt,
          pending: false,
          notice: { kind: 'success', messageKey: successKey },
        })
        return { ok: true }
      }

      if (result.code === 'STORAGE_CONFLICT') {
        commit({
          ...current,
          pending: false,
          externalChange: true,
          notice: {
            kind: 'error',
            messageKey: 'commitments.notices.storageBlocked',
          },
        })
        return { ok: false, reason: 'blocked' }
      }

      const notice = storageNotice(result.code)
      commit({ ...current, pending: false, notice })
      return {
        ok: false,
        reason: result.code === 'STORAGE_WRITE_BLOCKED' ? 'blocked' : 'storage',
        noticeKey: notice.messageKey,
      }
    },
    [commit],
  )

  async function create(
    draft: CommitmentDraft,
    acknowledged = false,
  ): Promise<CommitmentMutationResult> {
    const before = stateRef.current
    if (before.pending) return { ok: false, reason: 'duplicate' }
    if (before.externalChange) return { ok: false, reason: 'blocked' }

    const errors = validateCommitmentDraft(draft)
    if (errors.length > 0) {
      return { ok: false, reason: 'validation', errors }
    }

    const now = (depsRef.current?.now ?? (() => new Date()))()
    const id = (depsRef.current?.randomId ?? (() => crypto.randomUUID()))()
    const candidate: Commitment = {
      id,
      title: draft.title.trim(),
      ...(draft.description.trim()
        ? { description: draft.description.trim() }
        : {}),
      date: draft.date,
      startTime: draft.startTime,
      endTime: draft.endTime,
      type: draft.type as Commitment['type'],
      createdAt: now.toISOString(),
    }

    const overlap = findOverlaps(candidate, before.commitments)
    if (overlap.overlaps && !acknowledged) {
      return {
        ok: false,
        reason: 'overlap',
        conflicts: overlap.conflictingCommitments,
      }
    }

    return persist(
      [...before.commitments, candidate],
      'commitments.notices.created',
    )
  }

  async function update(
    id: string,
    draft: CommitmentDraft,
    acknowledged = false,
  ): Promise<CommitmentMutationResult> {
    const before = stateRef.current
    if (before.pending) return { ok: false, reason: 'duplicate' }
    if (before.externalChange) return { ok: false, reason: 'blocked' }

    const existing = before.commitments.find((item) => item.id === id)
    if (!existing) return { ok: false, reason: 'missing' }

    const errors = validateCommitmentDraft(draft)
    if (errors.length > 0) {
      return { ok: false, reason: 'validation', errors }
    }

    const candidate: Commitment = {
      ...existing,
      title: draft.title.trim(),
      ...(draft.description.trim()
        ? { description: draft.description.trim() }
        : {}),
      date: draft.date,
      startTime: draft.startTime,
      endTime: draft.endTime,
      type: draft.type as Commitment['type'],
    }
    if (!candidate.description) delete candidate.description

    const overlap = findOverlaps(candidate, before.commitments)
    if (
      isScheduleChanged(existing, draft) &&
      overlap.overlaps &&
      !acknowledged
    ) {
      return {
        ok: false,
        reason: 'overlap',
        conflicts: overlap.conflictingCommitments,
      }
    }

    return persist(
      before.commitments.map((item) => (item.id === id ? candidate : item)),
      'commitments.notices.updated',
    )
  }

  async function deleteCommitment(
    id: string,
  ): Promise<CommitmentMutationResult> {
    const before = stateRef.current
    if (before.pending) return { ok: false, reason: 'duplicate' }
    if (before.externalChange) return { ok: false, reason: 'blocked' }

    const ordered = orderedCommitments(before.commitments, 'en')
    const index = ordered.findIndex((item) => item.id === id)
    if (index === -1) return { ok: false, reason: 'missing' }

    const nextCommitments = before.commitments.filter((item) => item.id !== id)
    const nextItem = ordered[index + 1] ?? ordered[index - 1] ?? null
    return persist(nextCommitments, 'commitments.notices.deleted', {
      focusAfterDelete:
        nextCommitments.length === 0 ? 'empty' : (nextItem?.id ?? null),
    })
  }

  function reload(): void {
    const before = stateRef.current
    const next = loadedState(loadCommitments(depsRef.current))
    commit({
      ...next,
      focusAfterDelete: before.focusAfterDelete,
      pending: false,
    })
  }

  function handleDeleteFocusHandled(): void {
    if (stateRef.current.focusAfterDelete === null) return
    commit({ ...stateRef.current, focusAfterDelete: null })
  }

  useEffect(() => {
    function handleStorageEvent(event: StorageEvent) {
      if (event.key !== COMMITMENTS_STORAGE_KEY) return
      const before = stateRef.current
      commit({
        ...before,
        externalChange: true,
        notice: {
          kind: 'error',
          messageKey: 'commitments.notices.storageBlocked',
        },
      })
    }

    if (typeof window === 'undefined') return
    window.addEventListener('storage', handleStorageEvent)
    return () => window.removeEventListener('storage', handleStorageEvent)
  }, [commit])

  return {
    ...state,
    create,
    update,
    deleteCommitment,
    reload,
    handleDeleteFocusHandled,
    emptyDraft: (date: string) => emptyCommitmentDraft(date),
  }
}

export type CommitmentsController = ReturnType<typeof useCommitments>

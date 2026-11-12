import { useEffect, useState } from 'react'
import type { Commitment } from '../../../entities/commitment/model/types'
import { loadCommitments, saveCommitments } from '../../../shared/lib/commitmentsStorage'
import { validateCommitment } from '../../../entities/commitment/model/validation'
import { findOverlaps } from '../../../entities/commitment/model/overlap'
import { sanitizeCommitments } from '../../../entities/commitment/model/sanitize'

export interface CommitmentFormDraft {
  title: string
  description: string
  date: string
  startTime: string
  endTime: string
  type: 'fixed' | 'flexible'
}

export interface CommitmentErrors {
  title?: string
  date?: string
  startTime?: string
  endTime?: string
  type?: string
  range?: string
  overlap?: string
}

export function useCommitments() {
  const [commitments, setCommitments] = useState<Commitment[]>(() => loadCommitments())

  useEffect(() => {
    saveCommitments(commitments)
  }, [commitments])

  function validateDraft(draft: CommitmentFormDraft): CommitmentErrors {
    const errors: CommitmentErrors = {}
    const fieldErrors = validateCommitment({
      title: draft.title,
      date: draft.date,
      startTime: draft.startTime,
      endTime: draft.endTime,
      type: draft.type,
    })
    for (const err of fieldErrors) {
      errors[err.field] = err.messageKey
    }
    return errors
  }

  function createCommitment(draft: CommitmentFormDraft): Commitment | null {
    const candidate: Commitment = {
      id: crypto.randomUUID(),
      title: draft.title.trim(),
      ...(draft.description.trim() ? { description: draft.description.trim() } : {}),
      date: draft.date,
      startTime: draft.startTime,
      endTime: draft.endTime,
      type: draft.type,
    }

    const fieldErrors = validateCommitment(candidate)
    if (fieldErrors.length > 0) return null

    const overlap = findOverlaps(candidate, commitments)
    if (overlap.overlaps) return null

    setCommitments((prev) => [...prev, candidate])
    return candidate
  }

  function updateCommitment(
    id: string,
    draft: CommitmentFormDraft,
  ): Commitment | null {
    const existingIndex = commitments.findIndex((c) => c.id === id)
    if (existingIndex === -1) return null

    const candidate: Commitment = {
      id,
      title: draft.title.trim(),
      ...(draft.description.trim() ? { description: draft.description.trim() } : {}),
      date: draft.date,
      startTime: draft.startTime,
      endTime: draft.endTime,
      type: draft.type,
    }

    const fieldErrors = validateCommitment(candidate)
    if (fieldErrors.length > 0) return null

    const overlap = findOverlaps(candidate, commitments)
    if (overlap.overlaps) return null

    setCommitments((prev) =>
      prev.map((c) => (c.id === id ? candidate : c)),
    )
    return candidate
  }

  function deleteCommitment(id: string): void {
    setCommitments((prev) => prev.filter((c) => c.id !== id))
  }

  function sanitizeStored(): void {
    setCommitments((prev) => sanitizeCommitments(prev))
  }

  return {
    commitments,
    createCommitment,
    updateCommitment,
    deleteCommitment,
    validateDraft,
    sanitizeStored,
  }
}
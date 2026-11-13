import {
  errorsByField,
  validationMessageKey,
  type Commitment,
  type CommitmentDraft,
  type CommitmentFieldError,
} from '@/entities/commitment'

export function emptyCommitmentDraft(date: string): CommitmentDraft {
  return {
    title: '',
    description: '',
    date,
    startTime: '',
    endTime: '',
    type: '',
  }
}

export function draftFromCommitment(commitment: Commitment): CommitmentDraft {
  return {
    title: commitment.title,
    description: commitment.description ?? '',
    date: commitment.date,
    startTime: commitment.startTime,
    endTime: commitment.endTime,
    type: commitment.type,
  }
}

export function isScheduleChanged(
  original: Commitment | null,
  draft: CommitmentDraft,
): boolean {
  if (!original) return true
  return (
    original.date !== draft.date ||
    original.startTime !== draft.startTime ||
    original.endTime !== draft.endTime
  )
}

export function isDraftDirty(draft: CommitmentDraft): boolean {
  return (
    draft.title.trim().length > 0 ||
    draft.description.trim().length > 0 ||
    draft.startTime.length > 0 ||
    draft.endTime.length > 0 ||
    draft.type !== ''
  )
}

export { errorsByField, validationMessageKey }
export type { CommitmentFieldError }

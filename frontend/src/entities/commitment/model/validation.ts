import { COMMITMENT_TYPES } from '@/shared/config/commitments'
import { countGraphemes } from '@/shared/lib/graphemes'
import { isLocalDate, isLocalTime } from '@/shared/lib/localDateTime'
import {
  COMMITMENT_DESCRIPTION_MAX_GRAPHEMES,
  COMMITMENT_TITLE_MAX_GRAPHEMES,
} from './constants'
import type { Commitment, CommitmentDraft, CommitmentType } from './types'

export type CommitmentField =
  'title' | 'description' | 'date' | 'startTime' | 'endTime' | 'type' | 'range'

export type CommitmentValidationCode =
  | 'TITLE_REQUIRED'
  | 'TITLE_TOO_LONG'
  | 'DESCRIPTION_TOO_LONG'
  | 'DATE_REQUIRED'
  | 'DATE_INVALID'
  | 'START_TIME_REQUIRED'
  | 'START_TIME_INVALID'
  | 'END_TIME_REQUIRED'
  | 'END_TIME_INVALID'
  | 'RANGE_INVALID'
  | 'CROSS_MIDNIGHT'
  | 'TYPE_REQUIRED'
  | 'TYPE_INVALID'

export interface CommitmentFieldError {
  field: CommitmentField
  code: CommitmentValidationCode
}

export function validateCommitmentDraft(
  draft: CommitmentDraft,
): CommitmentFieldError[] {
  const errors: CommitmentFieldError[] = []
  const title = draft.title.trim()
  const description = draft.description.trim()

  if (title.length === 0) {
    errors.push({ field: 'title', code: 'TITLE_REQUIRED' })
  } else if (countGraphemes(title) > COMMITMENT_TITLE_MAX_GRAPHEMES) {
    errors.push({ field: 'title', code: 'TITLE_TOO_LONG' })
  }

  if (countGraphemes(description) > COMMITMENT_DESCRIPTION_MAX_GRAPHEMES) {
    errors.push({ field: 'description', code: 'DESCRIPTION_TOO_LONG' })
  }

  if (draft.date.trim().length === 0) {
    errors.push({ field: 'date', code: 'DATE_REQUIRED' })
  } else if (!isLocalDate(draft.date)) {
    errors.push({ field: 'date', code: 'DATE_INVALID' })
  }

  if (draft.startTime.trim().length === 0) {
    errors.push({ field: 'startTime', code: 'START_TIME_REQUIRED' })
  } else if (!isLocalTime(draft.startTime)) {
    errors.push({ field: 'startTime', code: 'START_TIME_INVALID' })
  }

  if (draft.endTime.trim().length === 0) {
    errors.push({ field: 'endTime', code: 'END_TIME_REQUIRED' })
  } else if (!isLocalTime(draft.endTime)) {
    errors.push({ field: 'endTime', code: 'END_TIME_INVALID' })
  }

  if (isLocalTime(draft.startTime) && isLocalTime(draft.endTime)) {
    if (draft.endTime === '00:00') {
      errors.push({ field: 'endTime', code: 'CROSS_MIDNIGHT' })
    } else if (draft.startTime >= draft.endTime) {
      errors.push({ field: 'endTime', code: 'RANGE_INVALID' })
    }
  }

  if (draft.type === '') {
    errors.push({ field: 'type', code: 'TYPE_REQUIRED' })
  } else if (!isCommitmentType(draft.type)) {
    errors.push({ field: 'type', code: 'TYPE_INVALID' })
  }

  return errors
}

export function validateCommitmentRecord(
  commitment: Commitment,
): CommitmentFieldError[] {
  return validateCommitmentDraft({
    title: commitment.title,
    description: commitment.description ?? '',
    date: commitment.date,
    startTime: commitment.startTime,
    endTime: commitment.endTime,
    type: commitment.type,
  })
}

export function isCommitmentType(value: string): value is CommitmentType {
  return COMMITMENT_TYPES.some((type) => type === value)
}

export function hasInvalidRange(startTime: string, endTime: string): boolean {
  return (
    isLocalTime(startTime) &&
    isLocalTime(endTime) &&
    (endTime === '00:00' || startTime >= endTime)
  )
}

export function errorsByField(
  errors: readonly CommitmentFieldError[],
): Partial<Record<CommitmentField, CommitmentValidationCode>> {
  const result: Partial<Record<CommitmentField, CommitmentValidationCode>> = {}
  for (const error of errors) {
    if (result[error.field] === undefined) {
      result[error.field] = error.code
    }
  }
  return result
}

const MESSAGE_KEYS: Record<CommitmentValidationCode, string> = {
  TITLE_REQUIRED: 'commitments.validation.titleRequired',
  TITLE_TOO_LONG: 'commitments.validation.titleTooLong',
  DESCRIPTION_TOO_LONG: 'commitments.validation.descriptionTooLong',
  DATE_REQUIRED: 'commitments.validation.dateRequired',
  DATE_INVALID: 'commitments.validation.dateInvalid',
  START_TIME_REQUIRED: 'commitments.validation.startTimeRequired',
  START_TIME_INVALID: 'commitments.validation.startTimeInvalid',
  END_TIME_REQUIRED: 'commitments.validation.endTimeRequired',
  END_TIME_INVALID: 'commitments.validation.endTimeInvalid',
  RANGE_INVALID: 'commitments.validation.invalidRange',
  CROSS_MIDNIGHT: 'commitments.validation.crossMidnight',
  TYPE_REQUIRED: 'commitments.validation.typeRequired',
  TYPE_INVALID: 'commitments.validation.typeInvalid',
}

export function validationMessageKey(code: CommitmentValidationCode): string {
  return MESSAGE_KEYS[code]
}

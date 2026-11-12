import type { Commitment, CommitmentType } from './types'
import { COMMITMENT_TYPES } from '../../../shared/config/commitments'

export interface ValidationError {
  field: 'title' | 'date' | 'startTime' | 'endTime' | 'type' | 'range' | 'overlap'
  messageKey: string
}

export function validateCommitment(
  commitment: Partial<Commitment>,
): ValidationError[] {
  const errors: ValidationError[] = []

  if (!commitment.title || commitment.title.trim().length === 0) {
    errors.push({ field: 'title', messageKey: 'commitments.validation.titleRequired' })
  }

  if (!commitment.date || commitment.date.trim().length === 0) {
    errors.push({ field: 'date', messageKey: 'commitments.validation.dateRequired' })
  }

  if (!commitment.startTime || commitment.startTime.trim().length === 0) {
    errors.push({ field: 'startTime', messageKey: 'commitments.validation.startTimeRequired' })
  }

  if (!commitment.endTime || commitment.endTime.trim().length === 0) {
    errors.push({ field: 'endTime', messageKey: 'commitments.validation.endTimeRequired' })
  }

  if (
    commitment.type !== undefined &&
    !COMMITMENT_TYPES.includes(commitment.type as CommitmentType)
  ) {
    errors.push({ field: 'type', messageKey: 'commitments.validation.typeRequired' })
  }

  if (
    commitment.startTime &&
    commitment.endTime &&
    commitment.startTime.trim().length > 0 &&
    commitment.endTime.trim().length > 0
  ) {
    if (!(commitment.startTime < commitment.endTime)) {
      errors.push({ field: 'range', messageKey: 'commitments.validation.invalidRange' })
    }
  }

  return errors
}

export function hasInvalidRange(
  startTime: string,
  endTime: string,
): boolean {
  return !(startTime < endTime)
}

export function isValidType(type: string): type is CommitmentType {
  return (COMMITMENT_TYPES as readonly string[]).includes(type)
}
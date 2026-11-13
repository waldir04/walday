export const COMMITMENTS_STORAGE_KEY = 'walday:commitments' as const

export const COMMITMENTS_STORAGE_VERSION = 1 as const

export const COMMITMENTS_LOCK_NAME = 'walday:commitments' as const

export const COMMITMENT_TYPES = ['fixed', 'flexible'] as const
export type CommitmentType = (typeof COMMITMENT_TYPES)[number]

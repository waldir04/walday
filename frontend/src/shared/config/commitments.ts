export const COMMITMENTS_STORAGE_KEY = 'walday:commitments' as const

export const COMMITMENT_TYPES = ['fixed', 'flexible'] as const
export type CommitmentType = (typeof COMMITMENT_TYPES)[number]

export const DEFAULT_COMMITMENT_TYPE: CommitmentType = 'fixed'

import { COMMITMENTS_STORAGE_KEY } from '@/shared/config/commitments'
import type { Commitment } from '@/entities/commitment'

export const COMMITMENT_A_ID = '11111111-1111-4111-8111-111111111111'
export const COMMITMENT_B_ID = '22222222-2222-4222-8222-222222222222'
export const COMMITMENT_C_ID = '33333333-3333-4333-8333-333333333333'

export function makeCommitment(
  overrides: Partial<Commitment> = {},
): Commitment {
  return {
    id: COMMITMENT_A_ID,
    title: 'Team sync',
    date: '2026-11-10',
    startTime: '09:00',
    endTime: '10:00',
    type: 'fixed',
    createdAt: '2026-11-10T08:00:00.000Z',
    ...overrides,
  }
}

export function makeEnvelope(
  commitments: Commitment[],
  overrides: { revision?: string; version?: number; updatedAt?: string } = {},
): string {
  return JSON.stringify({
    version: overrides.version ?? 1,
    revision: overrides.revision ?? 'rev-1',
    updatedAt: overrides.updatedAt ?? '2026-11-10T08:00:00.000Z',
    commitments,
  })
}

export function storeEnvelope(
  commitments: Commitment[],
  overrides: { revision?: string } = {},
): void {
  localStorage.setItem(
    COMMITMENTS_STORAGE_KEY,
    makeEnvelope(commitments, overrides),
  )
}

export function readEnvelope(): {
  version: number
  revision: string
  updatedAt: string
  commitments: Commitment[]
} {
  const raw = localStorage.getItem(COMMITMENTS_STORAGE_KEY)
  if (!raw) throw new Error('no stored commitments')
  return JSON.parse(raw) as {
    version: number
    revision: string
    updatedAt: string
    commitments: Commitment[]
  }
}

import { COMMITMENTS_STORAGE_KEY } from '@/shared/config/commitments'
import type { Commitment } from './types'
import { sanitizeCommitments } from './sanitize'

export function loadCommitments(): Commitment[] {
  try {
    if (typeof localStorage === 'undefined') return []
    const raw = localStorage.getItem(COMMITMENTS_STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return sanitizeCommitments(parsed)
  } catch {
    return []
  }
}

export function saveCommitments(commitments: Commitment[]): void {
  try {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(COMMITMENTS_STORAGE_KEY, JSON.stringify(commitments))
  } catch {
    // Gracefully ignore storage errors (unavailable/quota/etc.)
  }
}

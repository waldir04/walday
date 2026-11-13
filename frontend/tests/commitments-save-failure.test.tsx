import { fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { applyLanguage } from '@/shared/i18n'
import { COMMITMENTS_STORAGE_KEY } from '@/shared/config/commitments'
import { renderCommitmentsPage } from './helpers/renderCommitments'
import { readEnvelope } from './helpers/commitmentFixtures'

beforeEach(() => {
  localStorage.clear()
  applyLanguage('en')
})

afterEach(() => {
  vi.restoreAllMocks()
})

function fill() {
  fireEvent.change(screen.getByLabelText('Title'), {
    target: { value: 'Unsaved plan' },
  })
  fireEvent.change(screen.getByLabelText('Start time'), {
    target: { value: '09:00' },
  })
  fireEvent.change(screen.getByLabelText('End time'), {
    target: { value: '10:00' },
  })
  fireEvent.click(screen.getByRole('radio', { name: /Fixed/ }))
}

describe('save failures', () => {
  it('keeps the form open with entered values and no list entry on quota failure', async () => {
    const original = Storage.prototype.setItem
    const spy = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(function setItem(this: Storage, key, value) {
        if (key === COMMITMENTS_STORAGE_KEY) {
          throw new DOMException('Quota exceeded', 'QuotaExceededError')
        }
        return original.call(this, key, value)
      })

    renderCommitmentsPage(['/commitments?date=2026-11-10'])
    fill()
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(
      await screen.findByText(/Browser storage is full/i),
    ).toBeInTheDocument()
    expect(screen.queryByText('Commitment saved')).toBeNull()
    expect(screen.getByLabelText('Title')).toHaveValue('Unsaved plan')
    expect(screen.queryByRole('heading', { level: 3 })).toBeNull()
    expect(localStorage.getItem(COMMITMENTS_STORAGE_KEY)).toBeNull()

    spy.mockRestore()
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('Commitment saved')).toBeInTheDocument()
    expect(readEnvelope().commitments).toHaveLength(1)
  })

  it('offers retry for unavailable storage without false success', async () => {
    const original = Storage.prototype.setItem
    let blocked = true
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function setItem(
      this: Storage,
      key,
      value,
    ) {
      if (key === COMMITMENTS_STORAGE_KEY && blocked) {
        throw new DOMException('Unavailable', 'SecurityError')
      }
      return original.call(this, key, value)
    })

    renderCommitmentsPage(['/commitments?date=2026-11-10'])
    fill()
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(
      await screen.findByText(/Browser storage is unavailable/i),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()

    blocked = false
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(readEnvelope().commitments).toHaveLength(1))
  })
})

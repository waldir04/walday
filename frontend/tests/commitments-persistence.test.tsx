import { fireEvent, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { applyLanguage } from '@/shared/i18n'
import { COMMITMENTS_STORAGE_KEY } from '@/shared/config/commitments'
import { CommitmentsPageSkeleton } from '@/features/commitments'
import { render } from '@testing-library/react'
import { renderCommitmentsPage } from './helpers/renderCommitments'

beforeEach(() => {
  localStorage.clear()
  applyLanguage('en')
})

function create(title: string) {
  fireEvent.change(screen.getByLabelText('Title'), {
    target: { value: title },
  })
  fireEvent.change(screen.getByLabelText('Start time'), {
    target: { value: '09:00' },
  })
  fireEvent.change(screen.getByLabelText('End time'), {
    target: { value: '10:00' },
  })
  fireEvent.click(screen.getByRole('radio', { name: /Fixed/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
}

describe('persistence and recovery', () => {
  it('restores commitments after reload and shows the guest warning', async () => {
    const first = renderCommitmentsPage(['/commitments?date=2026-11-10'])
    create('Persisted plan')
    await screen.findByText('Persisted plan')
    first.unmount()

    renderCommitmentsPage(['/commitments?date=2026-11-10'])
    expect(await screen.findByText('Persisted plan')).toBeInTheDocument()
    expect(screen.getByText(/stored only in this browser/i)).toBeInTheDocument()
  })

  it('shows a localized read error for corrupt data without a false empty promise', () => {
    localStorage.setItem(COMMITMENTS_STORAGE_KEY, '{bad')
    renderCommitmentsPage(['/commitments?date=2026-11-10'])

    expect(
      screen.getByText(
        'Stored commitments could not be read. Existing data was left untouched.',
      ),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'No commitments for this date' }),
    ).not.toBeInTheDocument()
  })

  it('opens the form from the empty-state action and marks the skeleton busy', async () => {
    renderCommitmentsPage(['/commitments?date=2026-11-10'])
    fireEvent.click(screen.getByRole('button', { name: 'Create a commitment' }))
    await waitFor(() => expect(screen.getByLabelText('Title')).toHaveFocus())

    const skeleton = render(<CommitmentsPageSkeleton />)
    expect(
      skeleton.container.querySelector('[aria-busy="true"]'),
    ).not.toBeNull()
  })

  it('keeps unsaved data out of the list when the store is unavailable', async () => {
    const original = Storage.prototype.getItem
    Storage.prototype.getItem = function getItem(key: string) {
      if (key === COMMITMENTS_STORAGE_KEY) throw new Error('blocked')
      return original.call(this, key)
    }
    renderCommitmentsPage(['/commitments?date=2026-11-10'])
    expect(
      screen.getByText(/Browser storage is unavailable/i),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Title')).toBeInTheDocument()
    Storage.prototype.getItem = original
  })
})

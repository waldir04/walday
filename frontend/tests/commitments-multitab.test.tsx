import { fireEvent, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { applyLanguage } from '@/shared/i18n'
import { COMMITMENTS_STORAGE_KEY } from '@/shared/config/commitments'
import { renderCommitmentsPage } from './helpers/renderCommitments'
import {
  COMMITMENT_A_ID,
  COMMITMENT_B_ID,
  makeCommitment,
  makeEnvelope,
  readEnvelope,
  storeEnvelope,
} from './helpers/commitmentFixtures'

beforeEach(() => {
  localStorage.clear()
  applyLanguage('en')
})

function fill(title: string) {
  fireEvent.change(screen.getByLabelText('Title'), {
    target: { value: title },
  })
  fireEvent.change(screen.getByLabelText('Start time'), {
    target: { value: '11:00' },
  })
  fireEvent.change(screen.getByLabelText('End time'), {
    target: { value: '12:00' },
  })
  fireEvent.click(screen.getByRole('radio', { name: /Fixed/ }))
}

describe('multi-tab protection', () => {
  it('blocks saves after newer data is detected and offers reload', async () => {
    storeEnvelope([makeCommitment()], { revision: 'rev-1' })
    renderCommitmentsPage(['/commitments?date=2026-11-10'])
    fill('Blocked save')

    localStorage.setItem(
      COMMITMENTS_STORAGE_KEY,
      makeEnvelope(
        [
          makeCommitment(),
          makeCommitment({
            id: COMMITMENT_B_ID,
            title: 'Other tab',
            startTime: '13:00',
            endTime: '14:00',
          }),
        ],
        { revision: 'rev-2' },
      ),
    )

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(
      (
        await screen.findAllByText(
          /Stored commitments could not be read safely/i,
        )
      ).length,
    ).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument()
    expect(readEnvelope().commitments.map((item) => item.id)).toEqual([
      COMMITMENT_A_ID,
      COMMITMENT_B_ID,
    ])
    expect(screen.queryByText('Blocked save')).toBeNull()
  })

  it('blocks saves on a storage event without adopting the other tab data', async () => {
    storeEnvelope([makeCommitment()], { revision: 'rev-1' })
    renderCommitmentsPage(['/commitments?date=2026-11-10'])
    fill('Blocked event save')

    window.dispatchEvent(
      new StorageEvent('storage', {
        key: COMMITMENTS_STORAGE_KEY,
        newValue: makeEnvelope([makeCommitment()], { revision: 'rev-2' }),
      }),
    )

    expect(
      (
        await screen.findAllByText(
          /Stored commitments could not be read safely/i,
        )
      ).length,
    ).toBeGreaterThan(0)
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(readEnvelope().commitments).toHaveLength(1))
    expect(screen.queryByText('Blocked event save')).toBeNull()
  })
})

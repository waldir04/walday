import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { applyLanguage } from '@/shared/i18n'
import { renderCommitmentsPage } from './helpers/renderCommitments'
import {
  COMMITMENT_A_ID,
  COMMITMENT_B_ID,
  makeCommitment,
  readEnvelope,
  storeEnvelope,
} from './helpers/commitmentFixtures'

beforeEach(() => {
  localStorage.clear()
  applyLanguage('en')
})

describe('deleting commitments', () => {
  it('names the commitment in the dialog and supports cancel', () => {
    storeEnvelope([makeCommitment()])
    renderCommitmentsPage(['/commitments?date=2026-11-10'])

    const trigger = screen.getByRole('button', {
      name: 'Delete commitment: Team sync',
    })
    trigger.focus()
    fireEvent.click(trigger)
    const dialog = screen.getByRole('dialog')
    expect(
      within(dialog).getByRole('heading', { name: 'Delete commitment?' }),
    ).toBeInTheDocument()
    expect(within(dialog).getByText(/Team sync/)).toBeInTheDocument()
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Cancel',
      }),
    )

    expect(readEnvelope().commitments).toHaveLength(1)
    expect(
      screen.getByRole('button', { name: 'Delete commitment: Team sync' }),
    ).toHaveFocus()
  })

  it('deletes only the confirmed commitment and moves focus to the next item', async () => {
    storeEnvelope([
      makeCommitment({ id: COMMITMENT_A_ID, title: 'First' }),
      makeCommitment({
        id: COMMITMENT_B_ID,
        title: 'Second',
        startTime: '11:00',
        endTime: '12:00',
      }),
    ])
    renderCommitmentsPage(['/commitments?date=2026-11-10'])

    const trigger = screen.getByRole('button', {
      name: 'Delete commitment: First',
    })
    trigger.focus()
    fireEvent.click(trigger)
    fireEvent.click(screen.getByRole('button', { name: 'Delete commitment' }))

    expect(await screen.findByText('Commitment deleted')).toBeInTheDocument()
    await waitFor(() => expect(readEnvelope().commitments).toHaveLength(1))
    expect(readEnvelope().commitments[0]?.id).toBe(COMMITMENT_B_ID)
    await waitFor(() => {
      const second = document.querySelector<HTMLElement>(
        `[data-commitment-id="${COMMITMENT_B_ID}"]`,
      )
      expect(second).toHaveFocus()
    })
  })
})

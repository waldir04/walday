import { fireEvent, screen, waitFor } from '@testing-library/react'
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

describe('editing commitments', () => {
  it('prefills every field and saves an explicit edit', async () => {
    storeEnvelope([
      makeCommitment({ description: 'Original details', type: 'fixed' }),
    ])
    renderCommitmentsPage(['/commitments?date=2026-11-10'])

    fireEvent.click(
      screen.getByRole('button', { name: 'Edit commitment: Team sync' }),
    )
    expect(screen.getByLabelText('Title')).toHaveValue('Team sync')
    expect(screen.getByLabelText('Description (optional)')).toHaveValue(
      'Original details',
    )
    expect(screen.getByLabelText('Date')).toHaveValue('2026-11-10')
    expect(screen.getByLabelText('Start time')).toHaveValue('09:00')
    expect(screen.getByLabelText('End time')).toHaveValue('10:00')
    expect(screen.getByRole('radio', { name: /Fixed/ })).toBeChecked()

    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'Updated sync' },
    })
    fireEvent.change(screen.getByLabelText('Description (optional)'), {
      target: { value: 'Updated details' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Commitment updated')).toBeInTheDocument()
    const stored = readEnvelope().commitments[0]
    expect(stored).toMatchObject({
      id: COMMITMENT_A_ID,
      title: 'Updated sync',
      description: 'Updated details',
      startTime: '09:00',
      endTime: '10:00',
      type: 'fixed',
      createdAt: '2026-11-10T08:00:00.000Z',
    })
  })

  it('changes type explicitly without altering the schedule', async () => {
    storeEnvelope([makeCommitment({ type: 'fixed' })])
    renderCommitmentsPage(['/commitments?date=2026-11-10'])
    fireEvent.click(
      screen.getByRole('button', { name: 'Edit commitment: Team sync' }),
    )
    fireEvent.click(screen.getByRole('radio', { name: /Flexible/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() =>
      expect(readEnvelope().commitments[0]?.type).toBe('flexible'),
    )
    expect(readEnvelope().commitments[0]).toMatchObject({
      date: '2026-11-10',
      startTime: '09:00',
      endTime: '10:00',
    })
  })

  it('does not change other commitments or flexible schedules when viewing them', () => {
    storeEnvelope([
      makeCommitment({ id: COMMITMENT_A_ID, title: 'A', type: 'fixed' }),
      makeCommitment({
        id: COMMITMENT_B_ID,
        title: 'B',
        startTime: '11:00',
        endTime: '12:00',
        type: 'flexible',
      }),
    ])
    renderCommitmentsPage(['/commitments?date=2026-11-10'])
    fireEvent.click(screen.getByRole('button', { name: 'Edit commitment: B' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(readEnvelope().commitments).toEqual([
      makeCommitment({ id: COMMITMENT_A_ID, title: 'A', type: 'fixed' }),
      makeCommitment({
        id: COMMITMENT_B_ID,
        title: 'B',
        startTime: '11:00',
        endTime: '12:00',
        type: 'flexible',
      }),
    ])
  })
})

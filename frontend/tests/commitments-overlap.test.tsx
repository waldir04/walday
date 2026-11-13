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

function fill(values: {
  title: string
  start: string
  end: string
  date?: string
}) {
  fireEvent.change(screen.getByLabelText('Title'), {
    target: { value: values.title },
  })
  fireEvent.change(screen.getByLabelText('Start time'), {
    target: { value: values.start },
  })
  fireEvent.change(screen.getByLabelText('End time'), {
    target: { value: values.end },
  })
  if (values.date) {
    fireEvent.change(screen.getByLabelText('Date'), {
      target: { value: values.date },
    })
  }
  fireEvent.click(screen.getByRole('radio', { name: /Fixed/ }))
}

describe('overlaps and acknowledgment', () => {
  it('lists every conflict, blocks save until acknowledged, and preserves draft on decline', async () => {
    storeEnvelope([makeCommitment()])
    renderCommitmentsPage(['/commitments?date=2026-11-10'])
    fill({ title: 'Overlapping', start: '09:30', end: '10:30' })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    const heading = await screen.findByRole('heading', {
      name: 'Time conflict',
    })
    expect(heading).toBeInTheDocument()
    const conflicts = within(
      screen.getByRole('list', { name: 'Conflicting commitments' }),
    )
    expect(conflicts.getByText(/Team sync/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('heading', { name: 'Time conflict' })).toBeNull()
    expect(screen.getByLabelText('Title')).toHaveValue('Overlapping')
    expect(readEnvelope().commitments).toHaveLength(1)

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    fireEvent.click(
      await screen.findByRole('checkbox', {
        name: /I understand this commitment overlaps/i,
      }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Commitment saved')).toBeInTheDocument()
    expect(readEnvelope().commitments).toHaveLength(2)
    expect(screen.getByText(/Overlaps: Team sync/)).toBeInTheDocument()
  })

  it('does not conflict with the commitment being edited or boundary-touching periods', async () => {
    storeEnvelope([makeCommitment()])
    renderCommitmentsPage(['/commitments?date=2026-11-10'])

    fireEvent.click(
      screen.getByRole('button', { name: 'Edit commitment: Team sync' }),
    )
    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'Renamed sync' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('Commitment updated')).toBeInTheDocument()
    expect(screen.queryByText(/Overlaps:/)).toBeNull()

    fill({ title: 'After sync', start: '10:00', end: '11:00' })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('Commitment saved')).toBeInTheDocument()
    expect(readEnvelope().commitments).toHaveLength(2)
  })

  it('does not re-acknowledge title-only edits but does for schedule changes', async () => {
    storeEnvelope([
      makeCommitment({ id: COMMITMENT_A_ID, title: 'Fixed block' }),
      makeCommitment({
        id: COMMITMENT_B_ID,
        title: 'Overlap block',
        startTime: '09:30',
        endTime: '10:30',
        type: 'flexible',
      }),
    ])
    renderCommitmentsPage(['/commitments?date=2026-11-10'])

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Edit commitment: Overlap block',
      }),
    )
    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'Renamed block' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('Commitment updated')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Time conflict' })).toBeNull()

    fireEvent.click(
      screen.getByRole('button', { name: 'Edit commitment: Renamed block' }),
    )
    fireEvent.change(screen.getByLabelText('Start time'), {
      target: { value: '08:00' },
    })
    fireEvent.change(screen.getByLabelText('End time'), {
      target: { value: '09:30' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(
      await screen.findByRole('heading', { name: 'Time conflict' }),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await waitFor(() =>
      expect(readEnvelope().commitments[1]?.title).toBe('Renamed block'),
    )
    expect(readEnvelope().commitments[0]).toEqual(
      makeCommitment({ id: COMMITMENT_A_ID, title: 'Fixed block' }),
    )
  })
})

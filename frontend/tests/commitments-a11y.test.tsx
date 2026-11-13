import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { applyLanguage } from '@/shared/i18n'
import { renderCommitmentsPage } from './helpers/renderCommitments'
import { makeCommitment, storeEnvelope } from './helpers/commitmentFixtures'

beforeEach(() => {
  localStorage.clear()
  applyLanguage('en')
})

describe('commitments accessibility', () => {
  it('exposes labeled controls, type explanations, and field associations', () => {
    renderCommitmentsPage(['/commitments?date=2026-11-10'])
    expect(screen.getByLabelText('Title')).toBeInTheDocument()
    expect(screen.getByLabelText('Description (optional)')).toBeInTheDocument()
    expect(screen.getByLabelText('Viewed date')).toBeInTheDocument()
    expect(screen.getByText('Must happen at this time')).toBeInTheDocument()
    expect(screen.getByText('Can be moved if needed')).toBeInTheDocument()
  })

  it('traps focus in the delete dialog and returns it on escape', async () => {
    storeEnvelope([makeCommitment()])
    renderCommitmentsPage(['/commitments?date=2026-11-10'])
    const trigger = screen.getByRole('button', {
      name: 'Delete commitment: Team sync',
    })
    trigger.focus()
    fireEvent.click(trigger)

    const dialog = screen.getByRole('dialog')
    const cancel = within(dialog).getByRole('button', { name: 'Cancel' })
    await waitFor(() => expect(cancel).toHaveFocus())

    fireEvent.keyDown(dialog, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    await waitFor(() => expect(trigger).toHaveFocus())
  })

  it('announces success and exposes error summaries without color-only cues', async () => {
    renderCommitmentsPage(['/commitments?date=2026-11-10'])
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    const summary = screen.getByRole('alert')
    expect(summary).toHaveTextContent('Fix the highlighted fields')
    expect(
      screen.getAllByText('Choose fixed or flexible').length,
    ).toBeGreaterThan(0)

    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'Accessible plan' },
    })
    fireEvent.change(screen.getByLabelText('Start time'), {
      target: { value: '09:00' },
    })
    fireEvent.change(screen.getByLabelText('End time'), {
      target: { value: '10:00' },
    })
    fireEvent.click(screen.getByRole('radio', { name: /Fixed/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('Commitment saved')).toBeInTheDocument()
  })
})

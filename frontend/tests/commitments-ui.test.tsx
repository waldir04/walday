import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { applyLanguage } from '@/shared/i18n'
import { renderCommitmentsPage } from './helpers/renderCommitments'
import { readEnvelope } from './helpers/commitmentFixtures'

function fill(values: {
  title?: string
  description?: string
  date?: string
  start?: string
  end?: string
}) {
  if (values.title !== undefined) {
    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: values.title },
    })
  }
  if (values.description !== undefined) {
    fireEvent.change(screen.getByLabelText('Description (optional)'), {
      target: { value: values.description },
    })
  }
  if (values.date !== undefined) {
    fireEvent.change(screen.getByLabelText('Date'), {
      target: { value: values.date },
    })
  }
  if (values.start !== undefined) {
    fireEvent.change(screen.getByLabelText('Start time'), {
      target: { value: values.start },
    })
  }
  if (values.end !== undefined) {
    fireEvent.change(screen.getByLabelText('End time'), {
      target: { value: values.end },
    })
  }
}

function chooseType(label: 'Fixed' | 'Flexible') {
  fireEvent.click(screen.getByRole('radio', { name: new RegExp(label) }))
}

beforeEach(() => {
  localStorage.clear()
  applyLanguage('en')
})

describe('creating commitments', () => {
  it('shows the empty state, guest notice, and no preselected type', () => {
    renderCommitmentsPage(['/commitments?date=2026-11-10'])

    expect(
      screen.getByRole('heading', { level: 1, name: 'Daily commitments' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/stored only in this browser/i)).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'No commitments for this date' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Must happen at this time')).toBeInTheDocument()
    expect(screen.getByText('Can be moved if needed')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Fixed/ })).not.toBeChecked()
    expect(screen.getByRole('radio', { name: /Flexible/ })).not.toBeChecked()
    expect(screen.getByLabelText('Date')).toHaveValue('2026-11-10')
    expect(screen.queryByRole('button', { name: /sign in/i })).toBeNull()
  })

  it('requires an explicit type before saving', () => {
    renderCommitmentsPage(['/commitments?date=2026-11-10'])
    fill({
      title: 'Team sync',
      date: '2026-11-10',
      start: '09:00',
      end: '10:00',
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(screen.getByText('Choose fixed or flexible')).toBeInTheDocument()
    expect(localStorage.getItem('walday:commitments')).toBeNull()
  })

  it('creates fixed and flexible commitments with text labels and explanations', async () => {
    renderCommitmentsPage(['/commitments?date=2026-11-10'])
    fill({ title: 'Fixed sync', start: '09:00', end: '10:00' })
    chooseType('Fixed')
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Commitment saved')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByLabelText('Title')).toHaveValue(''))
    expect(
      screen.getByRole('heading', { level: 3, name: 'Fixed sync' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Must happen at this time')).toBeInTheDocument()

    fill({ title: 'Flexible walk', start: '17:00', end: '18:00' })
    chooseType('Flexible')
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(
      await screen.findByRole('heading', { level: 3, name: 'Flexible walk' }),
    ).toBeInTheDocument()
    expect(
      within(screen.getByRole('list')).getByText(/Can be moved if needed/),
    ).toBeInTheDocument()
    expect(readEnvelope().commitments).toHaveLength(2)
  })

  it('accepts past and future dates and prevents duplicate submissions', async () => {
    renderCommitmentsPage(['/commitments?date=2026-11-10'])
    fill({ title: 'Past plan', start: '09:00', end: '10:00' })
    chooseType('Fixed')
    const form = screen.getByRole('form')
    fireEvent.submit(form)
    fireEvent.submit(form)

    expect(await screen.findByText('Past plan')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByLabelText('Title')).toHaveValue(''))
    expect(readEnvelope().commitments).toHaveLength(1)

    fireEvent.click(screen.getByRole('button', { name: 'Next day' }))
    fill({
      title: 'Future plan',
      date: '2026-11-20',
      start: '11:00',
      end: '12:00',
    })
    chooseType('Flexible')
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(readEnvelope().commitments).toHaveLength(2))
  })
})

import { fireEvent, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { applyLanguage } from '@/shared/i18n'
import { renderCommitmentsPage } from './helpers/renderCommitments'
import { readEnvelope } from './helpers/commitmentFixtures'

beforeEach(() => {
  localStorage.clear()
  applyLanguage('en')
})

function fillBase(overrides: Partial<Record<string, string>> = {}) {
  fireEvent.change(screen.getByLabelText('Title'), {
    target: { value: overrides.title ?? 'Valid title' },
  })
  fireEvent.change(screen.getByLabelText('Description (optional)'), {
    target: { value: overrides.description ?? '' },
  })
  fireEvent.change(screen.getByLabelText('Date'), {
    target: { value: overrides.date ?? '2026-11-10' },
  })
  fireEvent.change(screen.getByLabelText('Start time'), {
    target: { value: overrides.start ?? '09:00' },
  })
  fireEvent.change(screen.getByLabelText('End time'), {
    target: { value: overrides.end ?? '10:00' },
  })
  fireEvent.click(screen.getByRole('radio', { name: /Fixed/ }))
}

describe('validation UX', () => {
  it('shows a summary, preserves values, and revalidates corrected fields', async () => {
    renderCommitmentsPage(['/commitments?date=2026-11-10'])
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(
      screen.getByText('Fix the highlighted fields before saving.'),
    ).toBeInTheDocument()
    expect(screen.getAllByText('Title is required').length).toBeGreaterThan(0)
    expect(
      screen.getAllByText('Choose fixed or flexible').length,
    ).toBeGreaterThan(0)
    expect(localStorage.getItem('walday:commitments')).toBeNull()

    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'Now valid' },
    })
    expect(screen.queryByText('Title is required')).toBeNull()
    expect(screen.getByLabelText('Title')).toHaveValue('Now valid')
  })

  it('rejects over-limit title and description while preserving entered text', () => {
    renderCommitmentsPage(['/commitments?date=2026-11-10'])
    fillBase({
      title: 'a'.repeat(121),
      description: 'b'.repeat(501),
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(
      screen.getAllByText('Title must be 120 characters or fewer').length,
    ).toBeGreaterThan(0)
    expect(
      screen.getAllByText('Description must be 500 characters or fewer').length,
    ).toBeGreaterThan(0)
    expect(screen.getByLabelText('Title')).toHaveValue('a'.repeat(121))
    expect(screen.getByLabelText('Description (optional)')).toHaveValue(
      'b'.repeat(501),
    )
  })

  it('rejects equal/reversed ranges and cross-midnight periods', () => {
    renderCommitmentsPage(['/commitments?date=2026-11-10'])
    fillBase({ start: '10:00', end: '10:00' })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(
      screen.getAllByText('End time must be later than start time').length,
    ).toBeGreaterThan(0)

    fireEvent.change(screen.getByLabelText('End time'), {
      target: { value: '00:00' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(
      screen.getAllByText(/Split this period into separate commitments/i)
        .length,
    ).toBeGreaterThan(0)
    expect(
      screen.queryByText('End time must be later than start time'),
    ).toBeNull()
  })

  it('associates errors with fields and focuses the summary', async () => {
    renderCommitmentsPage(['/commitments?date=2026-11-10'])
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    const summary = screen.getByRole('alert')
    await waitFor(() => expect(summary).toHaveFocus())
    const title = screen.getByLabelText('Title')
    expect(title).toHaveAttribute('aria-invalid', 'true')
    expect(title).toHaveAttribute('aria-describedby', 'commitment-title-error')
  })

  it('does not let an overlap acknowledgment bypass an invalid range', async () => {
    renderCommitmentsPage(['/commitments?date=2026-11-10'])
    await waitFor(() =>
      expect(screen.getByLabelText('Title')).toBeInTheDocument(),
    )
    fillBase({ start: '11:00', end: '10:00' })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(
      screen.getAllByText('End time must be later than start time').length,
    ).toBeGreaterThan(0)
    expect(screen.queryByRole('heading', { name: 'Time conflict' })).toBeNull()
    expect(readEnvelope).toThrow()
  })
})

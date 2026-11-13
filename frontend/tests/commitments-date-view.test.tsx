import { fireEvent, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { applyLanguage } from '@/shared/i18n'
import { getLocalToday } from '@/shared/lib/localDateTime'
import { renderCommitmentsPage } from './helpers/renderCommitments'
import {
  COMMITMENT_A_ID,
  COMMITMENT_B_ID,
  COMMITMENT_C_ID,
  makeCommitment,
  storeEnvelope,
} from './helpers/commitmentFixtures'

beforeEach(() => {
  localStorage.clear()
  applyLanguage('en')
})

describe('date view and ordering', () => {
  it('defaults to today, persists the viewed date, and navigates days', () => {
    const { router } = renderCommitmentsPage(['/commitments'])
    expect(screen.getByLabelText('Viewed date')).toHaveValue(getLocalToday())

    fireEvent.click(screen.getByRole('button', { name: 'Next day' }))
    expect(router.state.location.search).toContain('date=')
    expect(screen.getByLabelText('Viewed date')).not.toHaveValue(
      getLocalToday(),
    )

    fireEvent.click(screen.getByRole('button', { name: 'Today' }))
    expect(screen.getByLabelText('Viewed date')).toHaveValue(getLocalToday())
  })

  it('lists only the selected date in start-time, title, and id order', () => {
    storeEnvelope([
      makeCommitment({
        id: COMMITMENT_A_ID,
        title: 'Zeta',
        startTime: '10:00',
        endTime: '11:00',
      }),
      makeCommitment({
        id: COMMITMENT_B_ID,
        title: 'Beta',
        startTime: '09:00',
        endTime: '09:30',
      }),
      makeCommitment({
        id: COMMITMENT_C_ID,
        title: 'Alpha',
        startTime: '09:00',
        endTime: '09:30',
      }),
      makeCommitment({
        id: '44444444-4444-4444-8444-444444444444',
        title: 'Other day',
        date: '2026-11-11',
      }),
    ])

    renderCommitmentsPage(['/commitments?date=2026-11-10'])
    const headings = screen
      .getAllByRole('heading', { level: 3 })
      .map((heading) => heading.textContent)
    expect(headings).toEqual(['Alpha', 'Beta', 'Zeta'])
    expect(screen.queryByText('Other day')).toBeNull()
  })

  it('prefills a new commitment with the viewed date but keeps it editable', () => {
    renderCommitmentsPage(['/commitments?date=2026-11-18'])
    const date = screen.getByLabelText('Date')
    expect(date).toHaveValue('2026-11-18')
    fireEvent.change(date, { target: { value: '2026-11-19' } })
    expect(date).toHaveValue('2026-11-19')
  })
})

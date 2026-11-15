import { screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { TASKS_STORAGE_KEY } from '../src/shared/config/tasks'
import { COMMITMENTS_STORAGE_KEY } from '../src/shared/config/commitments'
import { getLocalToday } from '../src/shared/lib/localDateTime'
import { applyLanguage } from '../src/shared/i18n'
import {
  makeEnvelope as makeTaskEnvelope,
  makeStoredTask,
} from './helpers/taskFixtures'
import {
  makeCommitment,
  makeEnvelope as makeCommitmentEnvelope,
} from './helpers/commitmentFixtures'
import { renderApp } from './helpers/renderApp'

const today = getLocalToday()

beforeEach(() => {
  localStorage.clear()
  applyLanguage('en')
})

function seedTasks() {
  localStorage.setItem(
    TASKS_STORAGE_KEY,
    JSON.stringify(
      makeTaskEnvelope([
        makeStoredTask({
          id: 'task-pending',
          title: 'Plan the week',
          priority: 'high',
          dueDate: today,
          estimatedMinutes: 45,
          createdAt: '2026-11-12T10:00:00.000Z',
        }),
        makeStoredTask({
          id: 'task-completed',
          title: 'Clear the inbox',
          status: 'completed',
          priority: 'low',
          createdAt: '2026-11-12T09:00:00.000Z',
        }),
      ]),
    ),
  )
}

function seedCommitments() {
  localStorage.setItem(
    COMMITMENTS_STORAGE_KEY,
    makeCommitmentEnvelope([
      makeCommitment({
        id: '11111111-1111-4111-8111-111111111111',
        title: 'Evening review',
        date: today,
        startTime: '18:00',
        endTime: '19:00',
        type: 'flexible',
      }),
      makeCommitment({
        id: '22222222-2222-4222-8222-222222222222',
        title: 'Morning sync',
        date: today,
        startTime: '08:00',
        endTime: '08:30',
        type: 'fixed',
      }),
      makeCommitment({
        id: '33333333-3333-4333-8333-333333333333',
        title: 'Tomorrow planning',
        date: '2030-01-01',
      }),
    ]),
  )
}

describe('Home dashboard (US3)', () => {
  it('shows task counts, the full task collection, and today commitments only', () => {
    seedTasks()
    seedCommitments()
    renderApp(['/'])

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Today')
    expect(screen.getByText(/1 pending/)).toBeInTheDocument()
    expect(screen.getByText(/1 completed/)).toBeInTheDocument()
    expect(screen.getByText('Plan the week')).toBeInTheDocument()
    expect(screen.getByText('Clear the inbox')).toBeInTheDocument()
    expect(screen.getAllByText('High').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Pending').length).toBeGreaterThan(0)

    expect(screen.getByText('Morning sync')).toBeInTheDocument()
    expect(screen.getByText('Evening review')).toBeInTheDocument()
    expect(screen.queryByText('Tomorrow planning')).not.toBeInTheDocument()
  })

  it('orders today commitments chronologically with tabular times', () => {
    seedCommitments()
    renderApp(['/'])

    const morning = screen.getByText('Morning sync')
    const evening = screen.getByText('Evening review')
    expect(
      morning.compareDocumentPosition(evening) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()

    const time = screen.getByText(/8:00/)
    expect(time.className).toContain('tabular-nums')
  })

  it('renders read-only rows with no edit, delete, or completion controls', () => {
    seedTasks()
    seedCommitments()
    renderApp(['/'])

    const main = screen.getByRole('main')
    expect(within(main).queryByRole('checkbox')).not.toBeInTheDocument()
    expect(
      within(main).queryByRole('button', { name: /edit|delete/i }),
    ).not.toBeInTheDocument()
    expect(screen.queryByText('Actions for Plan the week')).toBeNull()
  })

  it('offers a calm empty state with working links when stores are empty', () => {
    renderApp(['/'])

    expect(screen.getByText('No tasks yet')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Go to Tasks' })).toHaveAttribute(
      'href',
      '/tasks',
    )
    expect(screen.getByText('Nothing scheduled')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Go to Commitments' }),
    ).toHaveAttribute('href', '/commitments')
  })

  it('offers a Settings action when no weather location is configured', () => {
    renderApp(['/'])

    expect(
      screen.getByRole('link', { name: 'Choose a location' }),
    ).toHaveAttribute('href', '/settings#weather-location')
  })

  it('shows a non-blocking storage notice when task storage needs attention', () => {
    localStorage.setItem(TASKS_STORAGE_KEY, '{corrupt')
    renderApp(['/'])

    const notices = screen.getAllByRole('status')
    expect(
      notices.some((notice) => within(notice).queryByText('Storage notice')),
    ).toBe(true)
    expect(screen.getByText('Review Tasks')).toBeInTheDocument()
  })
})

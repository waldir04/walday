import { screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { TASKS_STORAGE_KEY } from '../src/shared/config/tasks'
import { COMMITMENTS_STORAGE_KEY } from '../src/shared/config/commitments'
import { formatLocalDate, getLocalToday } from '../src/shared/lib/localDateTime'
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
      makeTaskEnvelope(
        [
          makeStoredTask({
            id: 'task-scheduled',
            title: 'Plan the week',
            priority: 'high',
            estimatedMinutes: 45,
            plannedDate: today,
            plannedStartTime: '10:00',
            createdAt: '2026-11-12T10:00:00.000Z',
          }),
          makeStoredTask({
            id: 'task-unscheduled',
            title: 'Clear the inbox',
            priority: 'low',
            createdAt: '2026-11-12T09:00:00.000Z',
          }),
        ],
        { version: 2 },
      ),
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

describe('Home dashboard agenda composition', () => {
  it('shows the selected date and one chronological agenda', async () => {
    seedTasks()
    seedCommitments()
    renderApp(['/'])
    await screen.findByRole('heading', { level: 1 })

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Today')
    expect(
      screen.getAllByText(formatLocalDate(today, 'en-US', 'medium')).length,
    ).toBeGreaterThan(0)

    const timeline = screen.getByRole('region', {
      name: `Timeline for ${formatLocalDate(today, 'en-US', 'medium')}`,
    })
    expect(within(timeline).getByText('Morning sync')).toBeInTheDocument()
    expect(within(timeline).getByText('Plan the week')).toBeInTheDocument()
    expect(within(timeline).getByText('Evening review')).toBeInTheDocument()
    expect(within(timeline).queryByText('Clear the inbox')).toBeNull()

    const unscheduled = screen.getByRole('region', {
      name: 'Unscheduled tasks',
    })
    expect(within(unscheduled).getByText('Clear the inbox')).toBeInTheDocument()

    const morning = within(timeline).getByText('Morning sync')
    const plan = within(timeline).getByText('Plan the week')
    const evening = within(timeline).getByText('Evening review')
    expect(
      morning.compareDocumentPosition(plan) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(
      plan.compareDocumentPosition(evening) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('renders the agenda after the weather and suggestions surfaces', async () => {
    seedTasks()
    seedCommitments()
    renderApp(['/'])
    await screen.findByRole('heading', { level: 1 })
    const heading = screen.getByRole('heading', { level: 1 })
    const page = heading.closest('div')?.parentElement
    expect(page).not.toBeNull()
    const weather = screen.getByText('Weather needs a location')
    const agenda = screen.getByRole('region', { name: /Timeline for/ })
    expect(
      weather.compareDocumentPosition(agenda) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('renders read-only rows with no edit, delete, or completion controls', async () => {
    seedTasks()
    seedCommitments()
    renderApp(['/'])
    await screen.findByRole('heading', { level: 1 })

    const main = screen.getByRole('main')
    expect(within(main).queryByRole('checkbox')).not.toBeInTheDocument()
    expect(
      within(main).queryByRole('button', { name: /edit|delete/i }),
    ).not.toBeInTheDocument()
  })

  it('offers the agenda empty state with both creation actions', async () => {
    renderApp(['/'])
    await screen.findByRole('button', { name: 'Create a task' })

    expect(
      screen.getByRole('button', { name: 'Create a commitment' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Create a task' }),
    ).toBeInTheDocument()
  })

  it('keeps the storage notice when task storage needs attention', async () => {
    localStorage.setItem(TASKS_STORAGE_KEY, '{corrupt')
    renderApp(['/'])
    await screen.findByText('Review Tasks')

    const notices = screen.getAllByRole('status')
    expect(
      notices.some((notice) => within(notice).queryByText('Storage notice')),
    ).toBe(true)
    expect(screen.getByText('Review Tasks')).toBeInTheDocument()
  })
})

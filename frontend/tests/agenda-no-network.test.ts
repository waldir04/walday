import { fireEvent, screen, within } from '@testing-library/react'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TASKS_STORAGE_KEY } from '../src/shared/config/tasks'
import { getLocalToday } from '../src/shared/lib/localDateTime'
import { applyLanguage } from '../src/shared/i18n'
import {
  makeEnvelope as makeTaskEnvelope,
  makeStoredTask,
} from './helpers/taskFixtures'
import { renderApp } from './helpers/renderApp'

const fetchSpy = vi.fn()
const xhrOpen = vi.fn()
const today = getLocalToday()

beforeEach(() => {
  localStorage.clear()
  applyLanguage('en')
  fetchSpy.mockClear()
  xhrOpen.mockClear()
  vi.stubGlobal('fetch', fetchSpy)
  vi.spyOn(XMLHttpRequest.prototype, 'open').mockImplementation(xhrOpen)
  localStorage.setItem(
    TASKS_STORAGE_KEY,
    JSON.stringify(
      makeTaskEnvelope(
        [
          makeStoredTask({
            id: 'task-1',
            title: 'Plan the week',
            estimatedMinutes: 60,
            plannedDate: today,
            plannedStartTime: '09:00',
          }),
        ],
        { version: 2 },
      ),
    ),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('the agenda stays local', () => {
  it('never calls fetch or XHR while viewing, navigating, or scheduling', async () => {
    renderApp(['/'])
    await screen.findByRole('heading', { level: 1 })

    fireEvent.click(screen.getByRole('button', { name: 'Next day' }))
    await screen.findByRole('heading', { level: 1 })
    fireEvent.click(screen.getByRole('button', { name: 'Today' }))
    await screen.findByRole('heading', { level: 1 })

    fireEvent.click(
      screen.getByRole('button', { name: 'Change time: Plan the week' }),
    )
    const dialog = screen.getByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText('Start time'), {
      target: { value: '10:00' },
    })
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Move schedule' }),
    )
    await screen.findByText('Schedule moved.')

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(xhrOpen).not.toHaveBeenCalled()
  })

  it('contains no network access in the agenda slice', () => {
    const root = join(process.cwd(), 'src/features/agenda')
    const files = readdirSync(root, { recursive: true })
      .map((entry) => String(entry))
      .filter((entry) => entry.endsWith('.ts') || entry.endsWith('.tsx'))

    for (const file of files) {
      const source = readFileSync(join(root, file), 'utf8')
      expect(source).not.toMatch(/\bfetch\s*\(/)
      expect(source).not.toMatch(/XMLHttpRequest/)
      expect(source).not.toMatch(/from ['"](?:axios|ky|superagent)['"]/)
    }
  })
})

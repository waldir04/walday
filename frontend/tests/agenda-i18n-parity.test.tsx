import { screen, act } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { resources, applyLanguage } from '@/shared/i18n'
import { formatLocalDate } from '@/shared/lib/localDateTime'
import { TASKS_STORAGE_KEY } from '../src/shared/config/tasks'
import { getLocalToday } from '../src/shared/lib/localDateTime'
import { makeEnvelope, makeStoredTask } from './helpers/taskFixtures'
import { renderApp } from './helpers/renderApp'

const today = getLocalToday()

function flattenKeys(value: unknown, prefix = ''): string[] {
  if (typeof value !== 'object' || value === null) return [prefix]
  return Object.entries(value).flatMap(([key, child]) =>
    flattenKeys(child, prefix ? `${prefix}.${key}` : key),
  )
}

beforeEach(() => {
  localStorage.clear()
  applyLanguage('en')
})

describe('agenda i18n parity', () => {
  it('has identical agenda keys in English and Spanish', () => {
    expect(flattenKeys(resources.es.agenda).sort()).toEqual(
      flattenKeys(resources.en.agenda).sort(),
    )
  })

  it('renders Spanish agenda copy without English leakage', async () => {
    localStorage.setItem(
      TASKS_STORAGE_KEY,
      JSON.stringify(
        makeEnvelope(
          [
            makeStoredTask({
              id: 'task-1',
              title: 'Planificar la semana',
              plannedDate: today,
              plannedStartTime: '09:00',
              estimatedMinutes: 30,
            }),
          ],
          { version: 2 },
        ),
      ),
    )
    renderApp(['/'])
    await screen.findByRole('heading', { level: 1 })
    applyLanguage('es')

    expect(await screen.findByText('Tareas sin programar')).toBeInTheDocument()
    expect(screen.getByText(/Ordenado por hora de inicio/)).toBeInTheDocument()
    expect(screen.getByText(/Cronología del/)).toBeInTheDocument()
    expect(screen.queryByText('Unscheduled tasks')).toBeNull()
    expect(screen.queryByText(/Ordered by start time/)).toBeNull()
  })

  it('formats dates with the locale and date-style preference', () => {
    expect(formatLocalDate('2026-11-15', 'es-ES', 'medium')).toMatch(/nov/i)
    expect(formatLocalDate('2026-11-15', 'en-US', 'medium')).toMatch(/Nov/i)
    expect(formatLocalDate('2026-11-15', 'en-US', 'short')).toBe('11/15/26')
  })

  it('does not mutate stored tasks or commitments when the language changes', async () => {
    localStorage.setItem(
      TASKS_STORAGE_KEY,
      JSON.stringify(
        makeEnvelope(
          [makeStoredTask({ id: 'task-1', title: 'Plan the week' })],
          { version: 2 },
        ),
      ),
    )
    const beforeTasks = localStorage.getItem(TASKS_STORAGE_KEY)
    renderApp(['/'])
    await screen.findByRole('heading', { level: 1 })

    await act(async () => {
      applyLanguage('es')
    })

    expect(localStorage.getItem(TASKS_STORAGE_KEY)).toBe(beforeTasks)
  })
})

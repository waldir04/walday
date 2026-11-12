import {
  cleanup,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { applyLanguage } from '@/shared/i18n'
import { TASKS_STORAGE_KEY } from '@/shared/config/tasks'
import { renderTasksPage } from './helpers/renderTasks'

beforeEach(() => {
  localStorage.clear()
  applyLanguage('en')
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('zero-network task operations', () => {
  it('never uses fetch or XMLHttpRequest across task journeys and recovery', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const openSpy = vi.spyOn(XMLHttpRequest.prototype, 'open')
    const sendSpy = vi.spyOn(XMLHttpRequest.prototype, 'send')

    renderTasksPage()

    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'Network-free task' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add task' }))
    await screen.findByText('Network-free task')

    fireEvent.click(
      screen.getByRole('button', { name: 'Edit Network-free task' }),
    )
    const form = screen.getByRole('form', { name: 'Edit task' })
    fireEvent.change(within(form).getByLabelText('Title'), {
      target: { value: 'Network-free edited' },
    })
    fireEvent.click(within(form).getByRole('button', { name: 'Save changes' }))
    await screen.findByText('Network-free edited')

    fireEvent.click(
      screen.getByRole('checkbox', {
        name: 'Mark Network-free edited complete',
      }),
    )
    await screen.findByRole('checkbox', {
      name: 'Mark Network-free edited pending',
    })

    fireEvent.click(
      screen.getByRole('button', { name: 'Delete Network-free edited' }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Delete task' }))
    await screen.findByRole('heading', { name: 'No tasks yet' })

    cleanup()
    localStorage.setItem(TASKS_STORAGE_KEY, '{corrupt')
    renderTasksPage()
    fireEvent.click(
      screen.getByRole('button', { name: 'Discard unreadable data' }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Discard' }))
    await waitFor(() =>
      expect(
        screen.queryByRole('heading', {
          name: 'Some stored tasks could not be restored',
        }),
      ).not.toBeInTheDocument(),
    )

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(openSpy).not.toHaveBeenCalled()
    expect(sendSpy).not.toHaveBeenCalled()
  })

  it('stays offline when persistence fails', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    renderTasksPage()

    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError')
    })
    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'Quota task' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add task' }))
    await screen.findByText('Quota task')
    expect(screen.getByRole('status')).toHaveTextContent(
      'Task created for this session only. It was not saved.',
    )

    expect(fetchSpy).not.toHaveBeenCalled()
  })
})

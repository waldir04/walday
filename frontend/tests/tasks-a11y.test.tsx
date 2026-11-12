import { fireEvent, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { applyLanguage } from '@/shared/i18n'
import { renderTasksPage } from './helpers/renderTasks'

beforeEach(() => {
  localStorage.clear()
  applyLanguage('en')
})

describe('create form accessibility', () => {
  it('associates a single title error with its input and announces it', () => {
    renderTasksPage()
    const title = screen.getByLabelText('Title')
    fireEvent.change(title, { target: { value: 'ab' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add task' }))

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Title must be at least 3 characters')
    expect(title).toHaveAttribute('aria-invalid', 'true')
    expect(title).toHaveAttribute('aria-describedby', 'task-title-error')
    expect(title).toHaveValue('ab')
  })

  it('summarizes multiple errors and associates each field', () => {
    renderTasksPage()
    const title = screen.getByLabelText('Title')
    const duration = screen.getByLabelText('Duration (optional)')

    fireEvent.change(title, { target: { value: 'ab' } })
    fireEvent.change(duration, { target: { value: '30' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add task' }))

    const summary = screen.getByRole('alert')
    expect(summary).toHaveTextContent('Please fix the following:')
    expect(
      within(summary).getByText('Title must be at least 3 characters'),
    ).toBeInTheDocument()
    expect(
      within(summary).getByText(/Enter a duration with a unit/i),
    ).toBeInTheDocument()

    expect(title).toHaveAttribute('aria-invalid', 'true')
    expect(duration).toHaveAttribute('aria-invalid', 'true')
    expect(title).toHaveAttribute('aria-describedby', 'task-title-error')
    expect(duration).toHaveAttribute('aria-describedby', 'task-duration-error')
    expect(title).toHaveValue('ab')
    expect(duration).toHaveValue('30')
  })

  it('exposes visible labels for every creation field', () => {
    renderTasksPage()
    expect(screen.getByLabelText('Title')).toHaveAttribute('id', 'task-title')
    expect(screen.getByLabelText('Description (optional)')).toHaveAttribute(
      'id',
      'task-description',
    )
    expect(screen.getByLabelText('Priority')).toHaveAttribute(
      'id',
      'task-priority',
    )
    expect(screen.getByLabelText('Due date (optional)')).toHaveAttribute(
      'id',
      'task-dueDate',
    )
    expect(screen.getByLabelText('Duration (optional)')).toHaveAttribute(
      'id',
      'task-duration',
    )
  })

  it('renders field errors next to the correct inputs', () => {
    renderTasksPage()
    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'Valid title' },
    })
    fireEvent.change(screen.getByLabelText('Duration (optional)'), {
      target: { value: '1.5h' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add task' }))

    expect(
      screen.getByText('Duration must resolve to a whole number of minutes'),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Title')).not.toHaveAttribute('aria-invalid')
  })
})

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { waitFor } from '@testing-library/react'
import { checkA11y, seriousViolations } from '../src/test/axe'

function addTask(title: string) {
  fireEvent.change(screen.getByLabelText('Title'), {
    target: { value: title },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Add task' }))
}

describe('task accessibility', () => {
  it('exposes semantic forms, groups, and named task controls', async () => {
    const { container } = renderTasksPage()
    expect(screen.getByRole('form', { name: 'New task' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite')

    addTask('Accessible task')
    await screen.findByText('Accessible task')

    expect(screen.getByRole('form', { name: 'New task' })).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Pending tasks' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('checkbox', { name: 'Mark Accessible task complete' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Edit Accessible task' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Delete Accessible task' }),
    ).toBeInTheDocument()

    const results = await checkA11y(container)
    expect(seriousViolations(results)).toEqual([])
  })

  it('meets automated checks in the empty and recovery states', async () => {
    const { container } = renderTasksPage()
    let results = await checkA11y(container)
    expect(seriousViolations(results)).toEqual([])

    localStorage.setItem('walday:tasks', '{corrupt')
    const second = renderTasksPage()
    await waitFor(() =>
      expect(
        screen.getAllByRole('heading', {
          name: 'Stored data needs attention',
        }).length,
      ).toBeGreaterThan(0),
    )
    results = await checkA11y(second.container)
    expect(seriousViolations(results)).toEqual([])
  })

  it('meets automated checks inside the delete dialog', async () => {
    renderTasksPage()
    addTask('Dialog task')
    await screen.findByText('Dialog task')

    const opener = screen.getByRole('button', { name: 'Delete Dialog task' })
    opener.focus()
    fireEvent.click(opener)
    const dialog = screen.getByRole('dialog', { name: 'Delete task' })

    const results = await checkA11y(dialog)
    expect(seriousViolations(results)).toEqual([])
    expect(dialog).toHaveAttribute('aria-modal', 'true')
  })

  it('gives interactive controls a minimum target size', async () => {
    renderTasksPage()

    expect(
      screen.getByRole('button', { name: 'Add task' }).className,
    ).toContain('min-h-11')
    addTask('Target task')
    await screen.findByText('Target task')

    const checkbox = screen.getByRole('checkbox', {
      name: 'Mark Target task complete',
    })
    expect(checkbox.className).toContain('h-6')
    expect(checkbox.className).toContain('w-6')
    expect(checkbox.className).toContain('min-h-6')
    expect(checkbox.className).toContain('min-w-6')
    for (const name of ['Edit Target task', 'Delete Target task']) {
      expect(screen.getByRole('button', { name }).className).toContain(
        'min-h-11',
      )
    }
  })

  it('supports keyboard submission and returns focus without stealing it', async () => {
    renderTasksPage()
    const title = screen.getByLabelText('Title')
    title.focus()
    fireEvent.change(title, { target: { value: 'Keyboard task' } })

    fireEvent.submit(screen.getByRole('form', { name: 'New task' }))

    expect(await screen.findByText('Keyboard task')).toBeInTheDocument()
    await waitFor(() => expect(title).toHaveFocus())
    expect(screen.getByRole('status')).toHaveTextContent('Task created.')
  })

  it('keeps a visible focus indicator in the global styles', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8')
    expect(css).toContain(':focus-visible')
    expect(css).toContain('outline: 2px solid var(--color-focus)')
  })

  it('moves focus into an edit form and back to the edit control', async () => {
    renderTasksPage()
    addTask('Edit focus task')
    await screen.findByText('Edit focus task')

    fireEvent.click(
      screen.getByRole('button', { name: 'Edit Edit focus task' }),
    )
    const form = screen.getByRole('form', { name: 'Edit task' })
    await waitFor(() =>
      expect(within(form).getByLabelText('Title')).toHaveFocus(),
    )

    fireEvent.click(within(form).getByRole('button', { name: 'Cancel' }))
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Edit Edit focus task' }),
      ).toHaveFocus(),
    )
  })

  it('provides responsive reflow and reduced-motion safeguards', async () => {
    renderTasksPage()
    addTask('Reflow task')
    await screen.findByText('Reflow task')

    const form = screen.getByRole('form', { name: 'New task' })
    expect(form.className).toContain('space-y-stack')
    const grid = form.querySelector('.grid')
    expect(grid?.className).toContain('sm:grid-cols-3')
    expect(grid?.className).not.toMatch(/(^|\s)grid-cols-3(\s|$)/)

    const item = screen.getByRole('listitem')
    expect(item.querySelector('.min-w-0')).not.toBeNull()
    expect(screen.getByText('Reflow task')).toHaveClass('break-words')

    const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8')
    expect(css).toContain('@media (prefers-reduced-motion: reduce)')
    expect(css).toContain('animation-duration: 0.01ms')
    expect(css).not.toContain('width: 100vw')
    expect(css).toContain('--spacing-page')
  })
})

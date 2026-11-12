import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { TASKS_STORAGE_KEY } from '@/shared/config/tasks'
import { applyLanguage } from '@/shared/i18n'
import { renderTasksPage } from './helpers/renderTasks'

function addTask(title: string) {
  fireEvent.change(screen.getByLabelText('Title'), {
    target: { value: title },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Add task' }))
}

function readEnvelope(): Record<string, unknown> {
  const raw = localStorage.getItem(TASKS_STORAGE_KEY)
  if (raw === null) throw new Error('no stored tasks')
  return JSON.parse(raw) as Record<string, unknown>
}

beforeEach(() => {
  localStorage.clear()
  applyLanguage('en')
})

describe('creating tasks', () => {
  it('shows the empty state, guest notice, and creation form', () => {
    renderTasksPage()

    expect(
      screen.getByRole('heading', { level: 1, name: 'Tasks' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Guest data is stored locally/i),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'No tasks yet' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Title')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add task' })).toBeInTheDocument()
  })

  it('focuses the title field from the empty-state action', () => {
    renderTasksPage()
    fireEvent.click(screen.getByRole('button', { name: 'Create a task' }))
    expect(screen.getByLabelText('Title')).toHaveFocus()
  })

  it('creates a title-only task with defaults and resets the form', async () => {
    renderTasksPage()
    addTask('Write report')

    expect(await screen.findByText('Write report')).toBeInTheDocument()
    expect(screen.getByText('Priority: Medium')).toBeInTheDocument()
    expect(screen.getByText('Pending')).toBeInTheDocument()
    expect(screen.queryByText(/Duration:/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Due:/)).not.toBeInTheDocument()
    expect(screen.getByLabelText('Title')).toHaveValue('')
    expect(screen.getByLabelText('Title')).toHaveFocus()

    const stored = readEnvelope()
    expect(stored.version).toBe(1)
    expect(typeof stored.revision).toBe('string')
    expect(stored.tasks).toHaveLength(1)
  })

  it('accepts all fields and displays localized metadata', async () => {
    renderTasksPage()
    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'Prepare presentation' },
    })
    fireEvent.change(screen.getByLabelText('Description (optional)'), {
      target: { value: 'Publish the planning deck' },
    })
    fireEvent.change(screen.getByLabelText('Priority'), {
      target: { value: 'high' },
    })
    fireEvent.change(screen.getByLabelText('Due date (optional)'), {
      target: { value: '2026-11-20' },
    })
    fireEvent.change(screen.getByLabelText('Duration (optional)'), {
      target: { value: '1 h 30 min' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add task' }))

    expect(await screen.findByText('Prepare presentation')).toBeInTheDocument()
    expect(screen.getByText('Publish the planning deck')).toBeInTheDocument()
    expect(screen.getByText('Priority: High')).toBeInTheDocument()
    expect(screen.getByText(/Due: Nov 20, 2026/)).toBeInTheDocument()
    expect(
      screen.getByText(/Duration: 1 hour and 30 minutes/),
    ).toBeInTheDocument()
  })

  it('trims titles and descriptions before storing them', async () => {
    renderTasksPage()
    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: '  Trimmed title  ' },
    })
    fireEvent.change(screen.getByLabelText('Description (optional)'), {
      target: { value: '  Trimmed description  ' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add task' }))

    expect(await screen.findByText('Trimmed title')).toBeInTheDocument()
    expect(screen.getByText('Trimmed description')).toBeInTheDocument()
    expect(screen.queryByText('  Trimmed title  ')).not.toBeInTheDocument()
  })

  it('enforces grapheme boundaries for titles', async () => {
    renderTasksPage()

    addTask('ab')
    expect(
      await screen.findByText('Title must be at least 3 characters'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'abc' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add task' }))
    expect(await screen.findByText('abc')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'a'.repeat(201) },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add task' }))
    expect(
      await screen.findByText('Title must be 200 characters or fewer'),
    ).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: '👍🏽👍🏽👍🏽' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add task' }))
    expect(await screen.findByText('👍🏽👍🏽👍🏽')).toBeInTheDocument()
  })

  it('allows duplicate titles as distinct tasks', async () => {
    renderTasksPage()
    addTask('Same title')
    await screen.findByText('Same title')

    addTask('Same title')
    await waitFor(() =>
      expect(screen.getAllByText('Same title')).toHaveLength(2),
    )
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })

  it('creates only one task when the form is submitted twice', async () => {
    renderTasksPage()
    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'Only once' },
    })
    const submit = screen.getByRole('button', { name: 'Add task' })
    fireEvent.click(submit)
    fireEvent.click(submit)

    await screen.findByText('Only once')
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
  })

  it('renders markup-like task content as plain text', async () => {
    const { container } = renderTasksPage()
    addTask('<b>Not bold</b>')

    expect(await screen.findByText('<b>Not bold</b>')).toBeInTheDocument()
    expect(container.querySelector('b')).toBeNull()
  })

  it('groups multiple created tasks and preserves metadata per item', async () => {
    renderTasksPage()
    addTask('First task')
    await screen.findByText('First task')
    addTask('Second task')
    await screen.findByText('Second task')

    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(screen.getAllByText('First task')).toHaveLength(1)
    expect(screen.getAllByText('Second task')).toHaveLength(1)
    expect(
      within(items[0] as HTMLElement).getAllByRole('checkbox'),
    ).toHaveLength(1)
  })
})

function editForm() {
  return within(screen.getByRole('form', { name: 'Edit task' }))
}

function openEdit(title: string) {
  fireEvent.click(screen.getByRole('button', { name: `Edit ${title}` }))
}

describe('editing tasks', () => {
  it('requires an explicit save and preserves the original on cancel', async () => {
    renderTasksPage()
    addTask('Original title')
    await screen.findByText('Original title')

    openEdit('Original title')
    fireEvent.change(editForm().getByLabelText('Title'), {
      target: { value: 'Changed title' },
    })
    fireEvent.click(editForm().getByRole('button', { name: 'Cancel' }))

    expect(screen.getByText('Original title')).toBeInTheDocument()
    expect(screen.queryByText('Changed title')).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Edit Original title' }),
    ).toHaveFocus()
  })

  it('does not commit edits on blur', async () => {
    renderTasksPage()
    addTask('Blur original')
    await screen.findByText('Blur original')

    openEdit('Blur original')
    const input = editForm().getByLabelText('Title')
    fireEvent.change(input, { target: { value: 'Blur changed' } })
    fireEvent.blur(input)

    const stored = readEnvelope()
    expect((stored.tasks as Record<string, unknown>[])[0]?.title).toBe(
      'Blur original',
    )
    fireEvent.click(editForm().getByRole('button', { name: 'Cancel' }))
    expect(screen.getByText('Blur original')).toBeInTheDocument()
    expect(screen.queryByText('Blur changed')).not.toBeInTheDocument()
  })

  it('saves every editable field and persists the change', async () => {
    renderTasksPage()
    addTask('Editable task')
    await screen.findByText('Editable task')
    const before = readEnvelope()
    const beforeTask = (before.tasks as Record<string, unknown>[])[0]

    openEdit('Editable task')
    const form = editForm()
    fireEvent.change(form.getByLabelText('Title'), {
      target: { value: 'Edited task' },
    })
    fireEvent.change(form.getByLabelText('Description (optional)'), {
      target: { value: 'Edited description' },
    })
    fireEvent.change(form.getByLabelText('Priority'), {
      target: { value: 'high' },
    })
    fireEvent.change(form.getByLabelText('Due date (optional)'), {
      target: { value: '2026-12-01' },
    })
    fireEvent.change(form.getByLabelText('Duration (optional)'), {
      target: { value: '45 min' },
    })
    fireEvent.click(form.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('Edited task')).toBeInTheDocument()
    expect(screen.getByText('Edited description')).toBeInTheDocument()
    expect(screen.getByText('Priority: High')).toBeInTheDocument()
    expect(screen.getByText(/Due: Dec 1, 2026/)).toBeInTheDocument()
    expect(screen.getByText(/Duration: 45 minutes/)).toBeInTheDocument()

    const after = readEnvelope()
    const afterTask = (after.tasks as Record<string, unknown>[])[0]
    expect(afterTask?.id).toBe(beforeTask?.id)
    expect(afterTask?.createdAt).toBe(beforeTask?.createdAt)
    expect(afterTask?.status).toBe('pending')
    expect(
      screen.getByRole('button', { name: 'Edit Edited task' }),
    ).toHaveFocus()
  })

  it('preserves identity, status, and position when editing non-status fields', async () => {
    renderTasksPage()
    addTask('Older task')
    await screen.findByText('Older task')
    addTask('Newer task')
    await screen.findByText('Newer task')

    fireEvent.click(
      screen.getByRole('checkbox', { name: 'Mark Older task complete' }),
    )
    await screen.findByRole('checkbox', { name: 'Mark Older task pending' })

    openEdit('Older task')
    fireEvent.change(editForm().getByLabelText('Priority'), {
      target: { value: 'low' },
    })
    fireEvent.click(editForm().getByRole('button', { name: 'Save changes' }))

    await screen.findByText('Older task')
    expect(
      screen.getByRole('checkbox', { name: 'Mark Older task pending' }),
    ).toBeChecked()
    expect(screen.getByText('Priority: Low')).toBeInTheDocument()
    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(
      within(items[1] as HTMLElement).getByText('Older task'),
    ).toBeInTheDocument()
  })

  it('rejects an invalid edit without applying any field', async () => {
    renderTasksPage()
    addTask('Valid original')
    await screen.findByText('Valid original')
    const before = JSON.stringify(readEnvelope())

    openEdit('Valid original')
    const form = editForm()
    fireEvent.change(form.getByLabelText('Title'), {
      target: { value: 'ab' },
    })
    fireEvent.change(form.getByLabelText('Priority'), {
      target: { value: 'high' },
    })
    fireEvent.click(form.getByRole('button', { name: 'Save changes' }))

    expect(
      screen.getByText('Title must be at least 3 characters'),
    ).toBeInTheDocument()
    expect(JSON.stringify(readEnvelope())).toBe(before)
    expect(editForm().getByLabelText('Title')).toHaveValue('ab')

    fireEvent.click(editForm().getByRole('button', { name: 'Cancel' }))
    expect(screen.getByText('Valid original')).toBeInTheDocument()
    expect(screen.getByText('Priority: Medium')).toBeInTheDocument()
  })

  it('clears optional values without invalidating the task', async () => {
    renderTasksPage()
    addTask('Clearable task')
    await screen.findByText('Clearable task')

    openEdit('Clearable task')
    let form = editForm()
    fireEvent.change(form.getByLabelText('Description (optional)'), {
      target: { value: 'Temporary description' },
    })
    fireEvent.change(form.getByLabelText('Due date (optional)'), {
      target: { value: '2026-12-01' },
    })
    fireEvent.change(form.getByLabelText('Duration (optional)'), {
      target: { value: '30 min' },
    })
    fireEvent.click(form.getByRole('button', { name: 'Save changes' }))
    await screen.findByText('Temporary description')

    openEdit('Clearable task')
    form = editForm()
    fireEvent.change(form.getByLabelText('Description (optional)'), {
      target: { value: '' },
    })
    fireEvent.change(form.getByLabelText('Due date (optional)'), {
      target: { value: '' },
    })
    fireEvent.change(form.getByLabelText('Duration (optional)'), {
      target: { value: '' },
    })
    fireEvent.click(form.getByRole('button', { name: 'Save changes' }))

    await screen.findByText('Clearable task')
    expect(screen.queryByText('Temporary description')).not.toBeInTheDocument()
    expect(screen.queryByText(/Due:/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Duration:/)).not.toBeInTheDocument()
  })
})

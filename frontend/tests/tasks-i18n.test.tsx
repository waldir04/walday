import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import i18n, { applyLanguage } from '../src/shared/i18n'
import '../src/shared/i18n'
import { AppProviders } from '../src/app/providers'
import { TasksPage } from '../src/pages/TasksPage'

function renderTasks() {
  return render(
    <AppProviders>
      <TasksPage />
    </AppProviders>,
  )
}

beforeEach(() => {
  localStorage.clear()
  applyLanguage('en')
})

afterEach(() => {
  applyLanguage('en')
})

describe('task copy externalization (US4)', () => {
  it('renders all task form copy from English resources', () => {
    renderTasks()
    expect(
      screen.getByRole('heading', { level: 1, name: 'Tasks' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Title')).toBeInTheDocument()
    expect(screen.getByLabelText('Description (optional)')).toBeInTheDocument()
    expect(screen.getByLabelText('Priority')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add task' })).toBeInTheDocument()
    expect(
      screen.getByText(/Guest data is stored locally/i),
    ).toBeInTheDocument()
    expect(screen.getByText('No tasks yet. Add one above.')).toBeInTheDocument()
  })

  it('renders the same task copy in Spanish without raw keys', async () => {
    renderTasks()
    applyLanguage('es')

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 1, name: 'Tareas' }),
      ).toBeInTheDocument()
    })
    expect(screen.getByLabelText('Título')).toBeInTheDocument()
    expect(screen.getByLabelText('Prioridad')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Agregar tarea' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/Los datos de invitado/i)).toBeInTheDocument()
    expect(
      screen.getByText('Aún no hay tareas. Agrega una arriba.'),
    ).toBeInTheDocument()
    expect(screen.queryByText(/tasks\./i)).not.toBeInTheDocument()
  })

  it('translates task item accessible labels', async () => {
    renderTasks()
    applyLanguage('es')
    await waitFor(() =>
      expect(
        screen.getByText('Aún no hay tareas. Agrega una arriba.'),
      ).toBeInTheDocument(),
    )
    expect(i18n.t('item.markComplete', { ns: 'tasks', title: 'Tarea' })).toBe(
      'Marcar Tarea como completada',
    )
  })
})

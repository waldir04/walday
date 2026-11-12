import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import enTasks from '../src/shared/i18n/locales/en/tasks.json'
import esTasks from '../src/shared/i18n/locales/es/tasks.json'
import i18n, { applyLanguage } from '../src/shared/i18n'
import { TASKS_STORAGE_KEY } from '@/shared/config/tasks'
import { makeEnvelope, makeStoredTask } from './helpers/taskFixtures'
import { renderTasksPage } from './helpers/renderTasks'

function flattenKeys(value: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key
    if (typeof child === 'object' && child !== null && !Array.isArray(child)) {
      return flattenKeys(child as Record<string, unknown>, path)
    }
    return [path]
  })
}

function seed(value: unknown) {
  localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(value))
}

async function switchTo(language: 'en' | 'es') {
  await act(async () => {
    applyLanguage(language)
  })
  await waitFor(() => expect(i18n.language).toBe(language))
}

beforeEach(() => {
  localStorage.clear()
  applyLanguage('en')
})

afterEach(() => {
  applyLanguage('en')
})

describe('task locale resources', () => {
  it('keeps English and Spanish key sets in parity', () => {
    const english = flattenKeys(enTasks).sort()
    const spanish = flattenKeys(esTasks).sort()
    expect(spanish).toEqual(english)
  })

  it('has no empty translations or raw keys', () => {
    for (const [language, resources] of [
      ['en', enTasks],
      ['es', esTasks],
    ] as const) {
      for (const key of flattenKeys(resources)) {
        const value = i18n.t(key, { ns: 'tasks', lng: language })
        expect(value.trim().length, `${language}:${key}`).toBeGreaterThan(0)
        expect(value).not.toBe(key)
      }
    }
  })

  it('falls back to English when a Spanish key is missing', () => {
    i18n.addResource('en', 'tasks', 'fallbackProbe', 'English fallback copy')
    expect(i18n.t('fallbackProbe', { ns: 'tasks', lng: 'es' })).toBe(
      'English fallback copy',
    )
  })

  it('uses locale pluralization for recovery counts', () => {
    expect(
      i18n.t('recovery.count', { ns: 'tasks', lng: 'en', count: 1 }),
    ).toContain('1 stored record')
    expect(
      i18n.t('recovery.count', { ns: 'tasks', lng: 'en', count: 3 }),
    ).toContain('3 stored records')
    expect(
      i18n.t('recovery.count', { ns: 'tasks', lng: 'es', count: 2 }),
    ).toContain('2 registros')
  })
})

describe('runtime language switching', () => {
  it('translates copy, preserves user content, and updates the document language', async () => {
    seed(
      makeEnvelope([
        makeStoredTask({
          title: 'Write report',
          description: 'Include metrics',
          dueDate: '2026-11-20',
          estimatedMinutes: 90,
          priority: 'high',
        }),
      ]),
    )
    renderTasksPage()
    expect(await screen.findByText('Write report')).toBeInTheDocument()

    await switchTo('es')

    expect(
      screen.getByRole('heading', { level: 1, name: 'Tareas' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Título')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Agregar tarea' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/Los datos de invitado/i)).toBeInTheDocument()
    expect(document.documentElement.lang).toBe('es')

    expect(screen.getByText('Write report')).toBeInTheDocument()
    expect(screen.getByText('Include metrics')).toBeInTheDocument()
    expect(screen.getByText('Prioridad: Alta')).toBeInTheDocument()

    const expectedDate = new Intl.DateTimeFormat('es', {
      dateStyle: 'medium',
    }).format(new Date(2026, 10, 20, 12))
    expect(
      screen.getByText(`Fecha límite: ${expectedDate}`),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Duración: 1 hora y 30 minutos/),
    ).toBeInTheDocument()
    expect(screen.queryByText(/tasks\.[a-zA-Z]/)).not.toBeInTheDocument()
  })

  it('preserves unsaved draft input across a language switch', async () => {
    renderTasksPage()
    const title = screen.getByLabelText('Title')
    fireEvent.change(title, { target: { value: 'Draft in progress' } })
    fireEvent.change(screen.getByLabelText('Description (optional)'), {
      target: { value: 'Draft description' },
    })

    await switchTo('es')

    expect(screen.getByLabelText('Título')).toHaveValue('Draft in progress')
    expect(screen.getByLabelText('Descripción (opcional)')).toHaveValue(
      'Draft description',
    )
  })

  it('preserves an open edit form and its draft', async () => {
    seed(makeEnvelope([makeStoredTask({ title: 'Edit me' })]))
    renderTasksPage()
    await screen.findByText('Edit me')

    fireEvent.click(screen.getByRole('button', { name: 'Edit Edit me' }))
    const form = screen.getByRole('form', { name: 'Edit task' })
    fireEvent.change(within(form).getByLabelText('Title'), {
      target: { value: 'Unsaved edit' },
    })

    await switchTo('es')

    const spanishForm = screen.getByRole('form', { name: 'Editar tarea' })
    expect(within(spanishForm).getByLabelText('Título')).toHaveValue(
      'Unsaved edit',
    )
    expect(
      screen.getByRole('button', { name: 'Guardar cambios' }),
    ).toBeInTheDocument()
  })

  it('preserves an open delete confirmation and translates its content', async () => {
    seed(makeEnvelope([makeStoredTask({ title: 'Dialog task' })]))
    renderTasksPage()
    await screen.findByText('Dialog task')

    const opener = screen.getByRole('button', { name: 'Delete Dialog task' })
    opener.focus()
    fireEvent.click(opener)
    expect(
      screen.getByRole('dialog', { name: 'Delete task' }),
    ).toBeInTheDocument()

    await switchTo('es')

    const dialog = screen.getByRole('dialog', { name: 'Eliminar tarea' })
    expect(dialog).toHaveAccessibleDescription(/Dialog task/)
    expect(dialog).toHaveAccessibleDescription(/no se puede deshacer/)
  })

  it('localizes recovery counts in the interface', async () => {
    seed(
      makeEnvelope([
        makeStoredTask({ id: 'invalid-one', title: 'ab' }),
        makeStoredTask({ id: 'invalid-two', title: 'cd' }),
      ]),
    )
    renderTasksPage()

    await switchTo('es')

    expect(
      screen.getByRole('heading', {
        name: 'Algunas tareas almacenadas no se pudieron restaurar',
      }),
    ).toBeInTheDocument()
    expect(screen.getByText(/2 registros almacenados/)).toBeInTheDocument()
  })
})

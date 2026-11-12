import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { createElement } from 'react'
import type { ReactElement } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CommitmentsPage } from '../src/pages/CommitmentsPage'
import '../src/shared/i18n'

function renderWithRouter(ui: ReactElement) {
  return render(createElement(MemoryRouter, null, ui))
}

describe('Commitments edit/delete (US2)', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    localStorage.clear()
    vi.stubGlobal('navigator', { language: 'en-US' })
  })

  it('edits an existing commitment and persists the update', async () => {
    renderWithRouter(createElement(CommitmentsPage, null))

    // Create
    fireEvent.change(screen.getByLabelText(/Title|Título/i), { target: { value: 'Original' } })
    fireEvent.change(screen.getByLabelText(/Date|Fecha/i), { target: { value: '2026-11-10' } })
    fireEvent.change(screen.getByLabelText(/Start time|Hora de inicio/i), { target: { value: '09:00' } })
    fireEvent.change(screen.getByLabelText(/End time|Hora de fin/i), { target: { value: '10:00' } })
    fireEvent.click(screen.getByRole('button', { name: /Save|Guardar/i }))
    await waitFor(() => expect(screen.getByText('Original')).toBeInTheDocument())

    // Edit
    const item = screen.getByText('Original').closest('article')
    fireEvent.click(within(item!).getByRole('button', { name: /Edit|Editar/i }))
    fireEvent.change(screen.getByLabelText(/Title|Título/i), { target: { value: 'Updated' } })
    fireEvent.click(screen.getByRole('button', { name: /Save|Guardar/i }))

    await waitFor(() => {
      expect(screen.getByText('Updated')).toBeInTheDocument()
      expect(screen.queryByText('Original')).not.toBeInTheDocument()
    })
    const raw = localStorage.getItem('walday:commitments')
    expect(raw).toContain('"title":"Updated"')
    expect(raw).not.toContain('"title":"Original"')
  })

  it('deletes an existing commitment after explicit confirmation', async () => {
    vi.spyOn(window, 'confirm').mockImplementation(() => true)
    renderWithRouter(createElement(CommitmentsPage, null))

    fireEvent.change(screen.getByLabelText(/Title|Título/i), { target: { value: 'To delete' } })
    fireEvent.change(screen.getByLabelText(/Date|Fecha/i), { target: { value: '2026-11-10' } })
    fireEvent.change(screen.getByLabelText(/Start time|Hora de inicio/i), { target: { value: '09:00' } })
    fireEvent.change(screen.getByLabelText(/End time|Hora de fin/i), { target: { value: '10:00' } })
    fireEvent.click(screen.getByRole('button', { name: /Save|Guardar/i }))
    await waitFor(() => expect(screen.getByText('To delete')).toBeInTheDocument())

    const item = screen.getByText('To delete').closest('article')
    fireEvent.click(within(item!).getByRole('button', { name: /Delete|Eliminar/i }))

    await waitFor(() => {
      expect(screen.queryByText('To delete')).not.toBeInTheDocument()
    })
    const raw = localStorage.getItem('walday:commitments')
    expect(raw).not.toContain('"title":"To delete"')
  })

  it('does not delete when confirmation is declined', async () => {
    vi.spyOn(window, 'confirm').mockImplementation(() => false)
    renderWithRouter(createElement(CommitmentsPage, null))

    fireEvent.change(screen.getByLabelText(/Title|Título/i), { target: { value: 'Keep me' } })
    fireEvent.change(screen.getByLabelText(/Date|Fecha/i), { target: { value: '2026-11-10' } })
    fireEvent.change(screen.getByLabelText(/Start time|Hora de inicio/i), { target: { value: '09:00' } })
    fireEvent.change(screen.getByLabelText(/End time|Hora de fin/i), { target: { value: '10:00' } })
    fireEvent.click(screen.getByRole('button', { name: /Save|Guardar/i }))
    await waitFor(() => expect(screen.getByText('Keep me')).toBeInTheDocument())

    const item = screen.getByText('Keep me').closest('article')
    fireEvent.click(within(item!).getByRole('button', { name: /Delete|Eliminar/i }))

    expect(screen.getByText('Keep me')).toBeInTheDocument()
  })
})
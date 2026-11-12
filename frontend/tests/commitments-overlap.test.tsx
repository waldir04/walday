import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { createElement } from 'react'
import type { ReactElement } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CommitmentsPage } from '../src/pages/CommitmentsPage'
import '../src/shared/i18n'

function renderWithRouter(ui: ReactElement) {
  return render(createElement(MemoryRouter, null, ui))
}

describe('Commitment overlap (US3)', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.stubGlobal('navigator', { language: 'en-US' })
  })

  it('identifies and communicates overlap without saving the conflicting commitment', async () => {
    renderWithRouter(createElement(CommitmentsPage, null))

    // First commitment
    fireEvent.change(screen.getByLabelText(/Title|Título/i), { target: { value: 'First' } })
    fireEvent.change(screen.getByLabelText(/Date|Fecha/i), { target: { value: '2026-11-10' } })
    fireEvent.change(screen.getByLabelText(/Start time|Hora de inicio/i), { target: { value: '09:00' } })
    fireEvent.change(screen.getByLabelText(/End time|Hora de fin/i), { target: { value: '10:00' } })
    fireEvent.click(screen.getByRole('button', { name: /Save|Guardar/i }))
    await waitFor(() => expect(screen.getByText('First')).toBeInTheDocument())

    // Overlapping second commitment
    const titleInput = screen.getByLabelText(/Title|Título/i)
    fireEvent.change(titleInput, { target: { value: 'Second' } })
    fireEvent.change(screen.getByLabelText(/Start time|Hora de inicio/i), { target: { value: '09:30' } })
    fireEvent.change(screen.getByLabelText(/End time|Hora de fin/i), { target: { value: '10:30' } })
    fireEvent.click(screen.getByRole('button', { name: /Save|Guardar/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
    // Overlap communicated, second commitment not saved
    expect(screen.queryByText('Second')).not.toBeInTheDocument()
    const raw = localStorage.getItem('walday:commitments')
    expect(raw).not.toContain('"title":"Second"')
    // First commitment untouched
    expect(screen.getByText('First')).toBeInTheDocument()
  })

  it('does not flag back-to-back commitments as overlapping', async () => {
    renderWithRouter(createElement(CommitmentsPage, null))

    fireEvent.change(screen.getByLabelText(/Title|Título/i), { target: { value: 'First' } })
    fireEvent.change(screen.getByLabelText(/Date|Fecha/i), { target: { value: '2026-11-10' } })
    fireEvent.change(screen.getByLabelText(/Start time|Hora de inicio/i), { target: { value: '09:00' } })
    fireEvent.change(screen.getByLabelText(/End time|Hora de fin/i), { target: { value: '10:00' } })
    fireEvent.click(screen.getByRole('button', { name: /Save|Guardar/i }))
    await waitFor(() => expect(screen.getByText('First')).toBeInTheDocument())

    fireEvent.change(screen.getByLabelText(/Title|Título/i), { target: { value: 'Second' } })
    fireEvent.change(screen.getByLabelText(/Date|Fecha/i), { target: { value: '2026-11-10' } })
    fireEvent.change(screen.getByLabelText(/Start time|Hora de inicio/i), { target: { value: '10:00' } })
    fireEvent.change(screen.getByLabelText(/End time|Hora de fin/i), { target: { value: '11:00' } })
    fireEvent.click(screen.getByRole('button', { name: /Save|Guardar/i }))

    await waitFor(() => expect(screen.getByText('Second')).toBeInTheDocument())
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
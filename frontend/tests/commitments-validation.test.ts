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

describe('Commitment validation (US3)', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.stubGlobal('navigator', { language: 'en-US' })
  })

  it('rejects end time before start time with accessible feedback', async () => {
    renderWithRouter(createElement(CommitmentsPage, null))
    fireEvent.change(screen.getByLabelText(/Title|Título/i), { target: { value: 'Bad range' } })
    fireEvent.change(screen.getByLabelText(/Date|Fecha/i), { target: { value: '2026-11-10' } })
    fireEvent.change(screen.getByLabelText(/Start time|Hora de inicio/i), { target: { value: '10:00' } })
    fireEvent.change(screen.getByLabelText(/End time|Hora de fin/i), { target: { value: '09:00' } })
    fireEvent.click(screen.getByRole('button', { name: /Save|Guardar/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
    expect(screen.queryByText('Bad range')).not.toBeInTheDocument()
  })

  it('rejects missing required title with accessible feedback', async () => {
    renderWithRouter(createElement(CommitmentsPage, null))
    fireEvent.change(screen.getByLabelText(/Date|Fecha/i), { target: { value: '2026-11-10' } })
    fireEvent.change(screen.getByLabelText(/Start time|Hora de inicio/i), { target: { value: '09:00' } })
    fireEvent.change(screen.getByLabelText(/End time|Hora de fin/i), { target: { value: '10:00' } })
    fireEvent.click(screen.getByRole('button', { name: /Save|Guardar/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
  })
})
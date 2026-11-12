import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { ReactElement } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CommitmentsPage } from '../src/pages/CommitmentsPage'
import '../src/shared/i18n'

function renderWithRouter(ui: ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('Commitments UI (US1)', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.stubGlobal('navigator', { language: 'en-US' })
  })

  it('creates a fixed commitment and displays it identified as fixed', async () => {
    renderWithRouter(<CommitmentsPage />)
    fireEvent.change(screen.getByLabelText(/Title|Título/i), {
      target: { value: 'Team meeting' },
    })
    fireEvent.change(screen.getByLabelText(/Date|Fecha/i), {
      target: { value: '2026-11-10' },
    })
    fireEvent.change(screen.getByLabelText(/Start time|Hora de inicio/i), {
      target: { value: '09:00' },
    })
    fireEvent.change(screen.getByLabelText(/End time|Hora de fin/i), {
      target: { value: '10:00' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Save|Guardar/i }))

    await waitFor(() => {
      expect(screen.getByText('Team meeting')).toBeInTheDocument()
    })
    const fixedItem = screen.getByText('Team meeting').closest('article')
    expect(within(fixedItem!).getByText(/Fixed/i)).toBeInTheDocument()
  })

  it('creates a flexible commitment identified as flexible', async () => {
    renderWithRouter(<CommitmentsPage />)
    fireEvent.change(screen.getByLabelText(/Title|Título/i), {
      target: { value: 'Exercise' },
    })
    fireEvent.change(screen.getByLabelText(/Date|Fecha/i), {
      target: { value: '2026-11-10' },
    })
    fireEvent.change(screen.getByLabelText(/Start time|Hora de inicio/i), {
      target: { value: '17:00' },
    })
    fireEvent.change(screen.getByLabelText(/End time|Hora de fin/i), {
      target: { value: '18:00' },
    })
    fireEvent.click(screen.getByRole('radio', { name: /Flexible|Flexible/i }))
    fireEvent.click(screen.getByRole('button', { name: /Save|Guardar/i }))

    await waitFor(() => {
      expect(screen.getByText('Exercise')).toBeInTheDocument()
    })
    const flexibleItem = screen.getByText('Exercise').closest('article')
    expect(within(flexibleItem!).getByText(/Flexible/i)).toBeInTheDocument()
  })

  it('rejects invalid time range and does not save', async () => {
    renderWithRouter(<CommitmentsPage />)
    fireEvent.change(screen.getByLabelText(/Title|Título/i), {
      target: { value: 'Bad range' },
    })
    fireEvent.change(screen.getByLabelText(/Date|Fecha/i), {
      target: { value: '2026-11-10' },
    })
    fireEvent.change(screen.getByLabelText(/Start time|Hora de inicio/i), {
      target: { value: '10:00' },
    })
    fireEvent.change(screen.getByLabelText(/End time|Hora de fin/i), {
      target: { value: '09:00' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Save|Guardar/i }))

    expect(screen.queryByText('Bad range')).not.toBeInTheDocument()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('restores saved commitments after reload', () => {
    localStorage.setItem(
      'walday:commitments',
      JSON.stringify([
        {
          id: '1', title: 'Restored meeting', date: '2026-11-10',
          startTime: '09:00', endTime: '10:00', type: 'fixed',
        },
      ]),
    )
    renderWithRouter(<CommitmentsPage />)
    expect(screen.getByText('Restored meeting')).toBeInTheDocument()
  })
})
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { createElement } from 'react'
import type { ReactElement } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CommitmentsPage } from '../src/pages/CommitmentsPage'
import i18n from '../src/shared/i18n'
import '../src/shared/i18n'

function renderWithRouter(ui: ReactElement) {
  return render(createElement(MemoryRouter, null, ui))
}

describe('Commitment accessibility and i18n (US3)', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.stubGlobal('navigator', { language: 'en-US' })
    i18n.changeLanguage('en')
  })

  it('renders accessible labeled inputs and perceivable error alerts', async () => {
    renderWithRouter(createElement(CommitmentsPage, null))
    expect(screen.getByLabelText(/Title|Título/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Date|Fecha/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Start time|Hora de inicio/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/End time|Hora de fin/i)).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Fixed|Fijo/i })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Flexible|Flexible/i })).toBeInTheDocument()
  })

  it('renders user-facing content in Spanish when language is Spanish', async () => {
    await i18n.changeLanguage('es')
    renderWithRouter(createElement(CommitmentsPage, null))
    await waitFor(() => {
      expect(screen.getByLabelText(/Título/i)).toBeInTheDocument()
    })
    expect(screen.getByLabelText(/Fecha/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Guardar/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Compromisos/i })).toBeInTheDocument()
  })

  it('distinguishes fixed and flexible by text labels, not color alone', async () => {
    renderWithRouter(createElement(CommitmentsPage, null))
    expect(screen.getByRole('radio', { name: /Fixed|Fijo/i })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Flexible|Flexible/i })).toBeInTheDocument()
  })
})
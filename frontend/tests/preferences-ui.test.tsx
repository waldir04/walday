import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SettingsPage } from '../src/pages/SettingsPage'
import { PreferencesProvider } from '../src/features/user-preferences/model/preferencesContext'
import '../src/shared/i18n'
import { PREFERENCES_STORAGE_KEY } from '../src/shared/config/preferences'

function renderWithProviders() {
  return render(
    <PreferencesProvider>
      <SettingsPage />
    </PreferencesProvider>,
  )
}

describe('Preferences UI (US1)', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.stubGlobal('navigator', { language: 'en-US' })
  })

  it('shows defaults and allows changing and saving preferences', async () => {
    renderWithProviders()
    expect(screen.getByLabelText(/Language|Idioma/i)).toBeInTheDocument()

    const language = screen.getByLabelText(/Language|Idioma/i) as HTMLSelectElement
    fireEvent.change(language, { target: { value: 'es' } })

    const submit = screen.getByRole('button', { name: /Preferences|Preferencias/i })
    fireEvent.click(submit)

    await waitFor(() => {
      const raw = localStorage.getItem(PREFERENCES_STORAGE_KEY)
      expect(raw).toBeTruthy()
      expect(raw).toContain('"language":"es"')
    })
  })

  it('restores saved preferences', () => {
    localStorage.setItem(
      PREFERENCES_STORAGE_KEY,
      JSON.stringify({
        language: 'es',
        dateTimePresentation: 'locale-short',
        weatherUnits: 'imperial',
        weatherLocation: { name: 'Lima' },
      }),
    )
    renderWithProviders()
    const units = screen.getByLabelText(/Weather units|Unidades del clima/i) as HTMLSelectElement
    expect(units.value).toBe('imperial')
    const loc = screen.getByLabelText(/Weather location|Ubicación del clima/i) as HTMLInputElement
    expect(loc.value).toBe('Lima')
  })
})
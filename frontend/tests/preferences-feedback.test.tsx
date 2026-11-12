import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SettingsPage } from '../src/pages/SettingsPage'
import { PreferencesProvider } from '../src/features/user-preferences'
import '../src/shared/i18n'
import { PREFERENCES_STORAGE_KEY } from '../src/shared/config/preferences'

function renderWithProviders() {
  return render(
    <PreferencesProvider>
      <SettingsPage />
    </PreferencesProvider>,
  )
}

describe('Preferences feedback (US3)', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.stubGlobal('navigator', { language: 'en-US' })
  })

  it('shows perceivable feedback and persists on update', async () => {
    renderWithProviders()
    const units = screen.getByLabelText(
      /Weather units|Unidades del clima/i,
    ) as HTMLSelectElement
    fireEvent.change(units, { target: { value: 'imperial' } })
    fireEvent.click(
      screen.getByRole('button', { name: /Preferences|Preferencias/i }),
    )

    expect(await screen.findByRole('status')).toHaveTextContent(
      /saved|guardadas/i,
    )
    await waitFor(() => {
      const raw = localStorage.getItem(PREFERENCES_STORAGE_KEY)
      expect(raw).toContain('"weatherUnits":"imperial"')
    })
  })
})

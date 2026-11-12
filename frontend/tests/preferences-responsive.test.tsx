import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PREFERENCES_STORAGE_KEY } from '../src/shared/config/preferences'
import { PreferencesPageSkeleton } from '../src/features/user-preferences'
import { applyLanguage } from '../src/shared/i18n'
import { FakeStorage } from './helpers/fakeStorage'
import { renderSettings } from './helpers/renderPreferences'
import { makeEnvelope, makePreferences } from './helpers/preferencesFixtures'
afterEach(() => {
  applyLanguage('en')
  vi.restoreAllMocks()
})

function setViewport(width: number): void {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    value: width,
  })
}

const LONG_LABEL =
  'San Cristóbal de las Casas, Región de los Altos de Chiapas, México'

describe('preferences responsive and motion behavior (US6)', () => {
  it.each([360, 768, 1024, 1440])(
    'renders the full surface at %i px without horizontal overflow',
    (width) => {
      setViewport(width)
      const storage = new FakeStorage({
        [PREFERENCES_STORAGE_KEY]: JSON.stringify(
          makeEnvelope(
            makePreferences({
              language: 'es',
              weatherLocation: {
                providerPlaceId: 'long',
                label: LONG_LABEL,
                latitude: 16.737,
                longitude: -92.637,
              },
            }),
          ),
        ),
      })

      const view = renderSettings({
        deps: {
          storage,
          browserLanguages: ['es-ES'],
          locks: null,
          timeZone: 'UTC',
        },
      })

      expect(
        screen.getByRole('heading', { name: 'Configuración' }),
      ).toBeInTheDocument()
      expect(screen.getByText(new RegExp(LONG_LABEL))).toBeInTheDocument()
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width)
      view.unmount()
    },
  )

  it('allows long Spanish labels and long location text to wrap', () => {
    setViewport(360)
    const storage = new FakeStorage({
      [PREFERENCES_STORAGE_KEY]: JSON.stringify(
        makeEnvelope(
          makePreferences({
            language: 'es',
            weatherLocation: {
              providerPlaceId: 'long',
              label: LONG_LABEL,
              latitude: 16.737,
              longitude: -92.637,
            },
          }),
        ),
      ),
    })

    renderSettings({
      deps: {
        storage,
        browserLanguages: ['es-ES'],
        locks: null,
        timeZone: 'UTC',
      },
    })

    const label = screen.getByText(new RegExp(LONG_LABEL))
    expect(label.className).toContain('break-words')
    expect(
      screen.getByRole('button', { name: 'Borrar ubicación' }),
    ).toBeInTheDocument()
  })

  it('keeps skeletons usable with reduced motion enabled', () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: (query: string): MediaQueryList => ({
        matches: true,
        media: query,
        onchange: null,
        addListener: () => undefined,
        removeListener: () => undefined,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        dispatchEvent: () => false,
      }),
    })

    render(<PreferencesPageSkeleton />)
    expect(screen.getByText('Loading settings')).toBeInTheDocument()
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull()
  })
})

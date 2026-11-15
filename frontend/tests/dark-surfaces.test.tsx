import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { applyLanguage } from '../src/shared/i18n'
import { renderApp } from './helpers/renderApp'

beforeEach(() => {
  localStorage.clear()
  applyLanguage('en')
})

const ROUTES: Array<[string, RegExp]> = [
  ['/', /today/i],
  ['/tasks', /^tasks$/i],
  ['/commitments', /commitments/i],
  ['/settings', /settings|configuración/i],
]

describe('dark surface consistency (US2)', () => {
  it.each(ROUTES)(
    'renders %s inside the dark canvas with one main region and one heading',
    async (route, heading) => {
      const { container } = renderApp([route])
      await screen.findByRole('heading', { level: 1, name: heading })

      const shell = container.firstElementChild
      expect(shell?.className).toContain('bg-canvas')

      expect(screen.getAllByRole('main')).toHaveLength(1)
      expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
      expect(
        screen.getByRole('main').querySelector('.bg-surface'),
      ).not.toBeNull()

      const markup = container.innerHTML
      expect(markup).not.toMatch(
        /bg-white|text-black|bg-slate-50|text-gray-900/,
      )
    },
  )
})

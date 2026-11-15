import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import '../src/shared/i18n'
import { renderApp } from './helpers/renderApp'

const DESTINATIONS = ['/', '/tasks', '/commitments', '/settings']

describe('application shell (US1)', () => {
  it('renders one banner, one named navigation, one main region, and one page heading', () => {
    renderApp(['/'])

    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(
      screen.getByRole('navigation', {
        name: /main navigation|navegación principal/i,
      }),
    ).toBeInTheDocument()
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content')
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getAllByText('Walday').length).toBeGreaterThan(0)
  })

  it('exposes the skip link as the first focusable control', () => {
    renderApp(['/'])
    const skipLink = screen.getByRole('link', {
      name: /skip to main content|saltar al contenido principal/i,
    })
    expect(skipLink).toHaveAttribute('href', '#main-content')
  })

  it('exposes exactly the four destinations and no Foundation link', () => {
    renderApp(['/'])
    const navigation = screen.getByRole('navigation')
    const links = within(navigation).getAllByRole('link')

    expect(links).toHaveLength(4)
    expect(links.map((link) => link.getAttribute('href'))).toEqual(DESTINATIONS)
    expect(
      within(navigation).queryByRole('link', { name: /foundation|base/i }),
    ).not.toBeInTheDocument()
  })

  it('marks the active destination with aria-current and a non-color cue', () => {
    renderApp(['/tasks'])
    const navigation = screen.getByRole('navigation')
    const active = within(navigation).getByRole('link', { name: /^tasks$/i })

    expect(active).toHaveAttribute('aria-current', 'page')
    expect(active.className).toContain('underline')
    expect(active.querySelector('[data-active-indicator]')).not.toBeNull()
  })
})

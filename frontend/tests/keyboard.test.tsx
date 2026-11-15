import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import '../src/shared/i18n'
import { renderApp } from './helpers/renderApp'

describe('keyboard and focus (US3)', () => {
  it('focuses the main region through the skip link', () => {
    renderApp(['/'])
    const skipLink = screen.getByRole('link', {
      name: /skip to main content|saltar al contenido principal/i,
    })
    skipLink.focus()
    expect(skipLink).toHaveFocus()
    expect(skipLink.getAttribute('href')).toBe('#main-content')
    expect(screen.getByRole('main')).toHaveAttribute('tabindex', '-1')
  })

  it('keeps navigation and content links in the tab order', async () => {
    renderApp(['/'])
    const links = screen.getAllByRole('link')
    for (const link of links) {
      expect(link.getAttribute('tabindex')).not.toBe('-1')
    }
    expect(links.length).toBeGreaterThanOrEqual(6)
    expect(await screen.findByRole('heading', { level: 1 })).toHaveAttribute(
      'tabindex',
      '-1',
    )
  })

  it('does not trap focus when moving between navigation items', () => {
    renderApp(['/'])
    const links = screen.getAllByRole('link')
    const first = links[0]
    const second = links[1]
    if (!first || !second) throw new Error('expected navigation links')
    first.focus()
    second.focus()
    expect(second).toHaveFocus()
    expect(first).not.toHaveFocus()
  })
})

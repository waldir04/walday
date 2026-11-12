import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import '../src/shared/i18n'
import { renderApp } from './helpers/renderApp'

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
})

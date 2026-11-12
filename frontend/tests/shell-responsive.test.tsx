import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderApp } from './helpers/renderApp'

const indexHtml = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8')

describe('responsive shell markup (US1)', () => {
  it('keeps the viewport declaration and a reflowable navigation layout', () => {
    expect(indexHtml).toContain('name="viewport"')
    expect(indexHtml).toContain('width=device-width, initial-scale=1.0')

    renderApp(['/'])
    const navigation = screen.getByRole('navigation')
    expect(navigation.className).toContain('flex-wrap')
    for (const link of screen.getAllByRole('link')) {
      expect(link.className).toContain('min-h-11')
    }
  })

  it('renders the shell without fixed-width containers that could overflow narrow viewports', () => {
    const { container } = renderApp(['/'])
    const shell = container.firstElementChild
    expect(shell?.className).toContain('min-h-screen')
    expect(container.innerHTML).not.toMatch(/width:\s*\d{3,}px/)
  })
})

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderApp } from './helpers/renderApp'

const indexHtml = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8')

describe('responsive shell markup (US1)', () => {
  it('keeps the viewport declaration and document theme metadata', () => {
    expect(indexHtml).toContain('name="viewport"')
    expect(indexHtml).toContain('width=device-width, initial-scale=1.0')
    expect(indexHtml).toContain('name="theme-color"')
    expect(indexHtml).toContain('content="#0B1215"')
  })

  it('renders a sticky, translucent header with a subtle boundary', () => {
    renderApp(['/'])
    const header = screen.getByRole('banner')

    expect(header.className).toContain('sticky')
    expect(header.className).toContain('top-0')
    expect(header.className).toContain('backdrop-blur-md')
    expect(header.className).toContain('bg-canvas/80')
    expect(header.className).toContain('border-b')
  })

  it('splits desktop destinations from the mobile trigger by breakpoint', () => {
    renderApp(['/'])
    const navigation = screen.getByRole('navigation')
    const desktop = navigation.querySelector('[data-desktop-nav]')
    const trigger = navigation.querySelector('[data-mobile-nav-trigger]')

    expect(desktop?.className).toContain('hidden')
    expect(desktop?.className).toContain('md:flex')
    expect(trigger?.className).toContain('md:hidden')

    for (const link of within(navigation).getAllByRole('link')) {
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

import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { resolve } from 'node:path'
import { applyLanguage } from '../src/shared/i18n'
import { renderApp } from './helpers/renderApp'

afterEach(() => {
  applyLanguage('en')
  document.body.style.overflow = ''
  vi.unstubAllGlobals()
})

function openDrawer() {
  const view = renderApp(['/'])
  const trigger = screen.getByRole('button', { name: 'Open menu' })
  trigger.focus()
  fireEvent.click(trigger)
  const dialog = screen.getByRole('dialog', { name: 'Main menu' })
  return { ...view, trigger, dialog }
}

describe('mobile navigation drawer (US1)', () => {
  it('opens a named modal dialog and moves focus inside it', () => {
    const { dialog } = openDrawer()

    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(within(dialog).getAllByRole('link')).toHaveLength(4)
    expect(
      within(dialog).getByRole('button', { name: 'Close menu' }),
    ).toHaveFocus()
  })

  it('traps Tab within the drawer and closes on Escape with focus return', async () => {
    const { dialog, trigger } = openDrawer()
    const close = within(dialog).getByRole('button', { name: 'Close menu' })
    const lastLink = within(dialog).getByRole('link', { name: 'Settings' })

    lastLink.focus()
    fireEvent.keyDown(dialog, { key: 'Tab' })
    expect(close).toHaveFocus()

    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true })
    expect(lastLink).toHaveFocus()

    fireEvent.keyDown(dialog, { key: 'Escape' })
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    )
    expect(trigger).toHaveFocus()
  })

  it('closes when a destination is selected', async () => {
    const { dialog } = openDrawer()
    fireEvent.click(within(dialog).getByRole('link', { name: 'Tasks' }))

    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    )
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Tasks' }),
    ).toBeInTheDocument()
  })

  it('closes on a route change from outside the drawer', async () => {
    const { router } = openDrawer()
    await act(async () => {
      await router.navigate('/commitments')
    })

    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    )
  })

  it('locks background scroll while open and restores it on close', async () => {
    const { dialog } = openDrawer()
    expect(document.body.style.overflow).toBe('hidden')

    fireEvent.keyDown(dialog, { key: 'Escape' })
    await waitFor(() => expect(document.body.style.overflow).toBe(''))
  })

  it('hides the desktop navigation from the accessibility tree while open', () => {
    openDrawer()
    const desktop = screen
      .getByRole('navigation')
      .querySelector('[data-desktop-nav]')

    expect(desktop).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByRole('navigation')).toHaveAttribute(
      'aria-label',
      'Main navigation',
    )
  })

  it('closes when the viewport grows past 768 px within the motion budget', async () => {
    let listener: ((event: { matches: boolean }) => void) | null = null
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => undefined,
        removeListener: () => undefined,
        addEventListener: (
          _type: string,
          handler: (event: { matches: boolean }) => void,
        ) => {
          listener = handler
        },
        removeEventListener: () => undefined,
        dispatchEvent: () => false,
      }),
    })

    openDrawer()
    expect(listener).not.toBeNull()
    await act(async () => {
      listener?.({ matches: true })
    })

    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    )

    const { readFileSync } = await import('node:fs')
    const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8')
    expect(css).toContain('drawer-in 160ms')
  })
})

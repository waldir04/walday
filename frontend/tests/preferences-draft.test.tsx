import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { PREFERENCES_STORAGE_KEY } from '../src/shared/config/preferences'
import { applyLanguage } from '../src/shared/i18n'
import { FakeStorage } from './helpers/fakeStorage'
import { renderSettings } from './helpers/renderPreferences'

afterEach(() => {
  applyLanguage('en')
})

function deps(storage: FakeStorage) {
  return { storage, browserLanguages: ['en-US'], locks: null, timeZone: 'UTC' }
}

function beforeUnloadEvent(): Event {
  return new Event('beforeunload', { cancelable: true })
}

describe('draft handling (US3)', () => {
  it('tracks a dirty draft and cancels back to the applied values', () => {
    const storage = new FakeStorage()
    renderSettings({ deps: deps(storage) })

    const metric = screen.getByLabelText(/Metric/)
    const imperial = screen.getByLabelText(/Imperial/)
    expect(metric).toBeChecked()

    fireEvent.click(imperial)
    expect(imperial).toBeChecked()
    expect(screen.getByText('You have unsaved changes.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(metric).toBeChecked()
    expect(
      screen.queryByText('You have unsaved changes.'),
    ).not.toBeInTheDocument()
    expect(imperial).not.toBeChecked()
    expect(storage.setItemCalls).toBe(0)
  })

  it('blocks in-app navigation and offers stay or discard', async () => {
    const storage = new FakeStorage()
    const { router } = renderSettings({ deps: deps(storage) })

    fireEvent.click(screen.getByLabelText(/Imperial/))
    act(() => {
      void router.navigate('/')
    })

    const dialog = await screen.findByRole('dialog')
    expect(dialog).toBeInTheDocument()
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Stay on this page' }),
    )
    expect(router.state.location.pathname).toBe('/settings')

    act(() => {
      void router.navigate('/')
    })
    const second = await screen.findByRole('dialog')
    fireEvent.click(
      within(second).getByRole('button', { name: 'Discard changes' }),
    )
    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
  })

  it('registers beforeunload only while the draft differs', () => {
    const storage = new FakeStorage()
    renderSettings({ deps: deps(storage) })

    const cleanEvent = beforeUnloadEvent()
    window.dispatchEvent(cleanEvent)
    expect(cleanEvent.defaultPrevented).toBe(false)

    fireEvent.click(screen.getByLabelText(/Imperial/))
    const dirtyEvent = beforeUnloadEvent()
    window.dispatchEvent(dirtyEvent)
    expect(dirtyEvent.defaultPrevented).toBe(true)

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    const cancelledEvent = beforeUnloadEvent()
    window.dispatchEvent(cancelledEvent)
    expect(cancelledEvent.defaultPrevented).toBe(false)
  })

  it('focuses the first invalid field and preserves the draft', async () => {
    const storage = new FakeStorage()
    renderSettings({ deps: deps(storage) })

    fireEvent.click(screen.getByLabelText(/Imperial/))
    const query = screen.getByLabelText('Search for a place')
    fireEvent.change(query, { target: { value: 'a'.repeat(81) } })
    fireEvent.click(screen.getByRole('button', { name: 'Save preferences' }))

    expect(
      (
        await screen.findAllByText(
          'Enter a place name between 1 and 80 characters.',
        )
      ).length,
    ).toBeGreaterThan(0)
    expect(query).toHaveAttribute('aria-invalid', 'true')
    expect(query).toHaveFocus()
    expect(screen.getByLabelText(/Imperial/)).toBeChecked()
    expect(storage.setItemCalls).toBe(0)
    expect(storage.getItem(PREFERENCES_STORAGE_KEY)).toBeNull()
  })
})

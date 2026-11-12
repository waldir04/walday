import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import '../src/shared/i18n'
import { renderApp } from './helpers/renderApp'

describe('routing (US2)', () => {
  it('resolves a lazy route on direct load and sets the localized title', async () => {
    const { router } = renderApp(['/tasks'])

    expect(
      await screen.findByRole('heading', { level: 1, name: /^Tasks$/i }),
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/tasks')
    await waitFor(() => expect(document.title).toBe('Tasks'))
  })

  it('resolves the foundation placeholder route', async () => {
    renderApp(['/foundation'])
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: /application foundation/i,
      }),
    ).toBeInTheDocument()
  })

  it('marks the active navigation item with aria-current', async () => {
    renderApp(['/commitments'])
    await screen.findByRole('heading', { level: 1, name: /daily commitments/i })
    const active = screen.getByRole('link', { name: /^commitments$/i })
    expect(active).toHaveAttribute('aria-current', 'page')
  })

  it('navigates without a reload and supports history', async () => {
    const { router } = renderApp(['/'])

    const tasksLink = screen.getByRole('link', { name: /^tasks$/i })
    fireEvent.click(tasksLink)
    expect(
      await screen.findByRole('heading', { level: 1, name: /^Tasks$/i }),
    ).toBeInTheDocument()

    await router.navigate(-1)
    expect(
      await screen.findByRole('heading', { level: 1, name: /^Walday$/i }),
    ).toBeInTheDocument()
  })

  it('moves focus to the page heading after navigation', async () => {
    const { router } = renderApp(['/'])
    await router.navigate('/foundation')

    const heading = await screen.findByRole('heading', {
      level: 1,
      name: /application foundation/i,
    })
    await waitFor(() => expect(heading).toHaveFocus())
  })
})
